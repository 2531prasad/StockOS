
// components/apps/india-macro/display2.tsx
"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useIndiaMacroStore } from "./store";
import {
  calculateGDP,
  calculatePopulation,
  calculatePPP,
  formatUSD,
  formatCompact,
  splitHistoricalAndForecast,
  getLatestValue,
  IMF_INDICATORS_TO_FETCH
} from "./utils";
import { systemAppTheme } from "@/components/theme/system-app-theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Deck.gl imports
import { DeckGL } from '@deck.gl/react';
import { LineLayer } from '@deck.gl/layers';
import { OrthographicView } from '@deck.gl/core';


const currentYear = new Date().getFullYear();

// A new component for the Deck.gl chart
const DeckGLChart = ({
  historicalData,
  forecastData
}: {
  historicalData: { year: number; value: number }[];
  forecastData: { year: number; value: number }[];
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 300, height: 200 });
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    year: number;
    value: number;
  } | null>(null);

  // Resize observer to track canvas size
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const allData = [...historicalData, ...forecastData];
  if (allData.length < 2) {
    return <p className="text-xs text-muted-foreground text-center flex items-center justify-center h-full">Not enough data</p>;
  }

  // Calculate chart bounds
  const { minYear, maxYear, minValue, maxValue } = useMemo(() => {
    const years = allData.map((d) => d.year);
    const values = allData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const yearPadding = 0.5;
    const valuePadding = (maxVal - minVal) * 0.1 || 1;

    return {
      minYear: Math.min(...years) - yearPadding,
      maxYear: Math.max(...years) + yearPadding,
      minValue: minVal - valuePadding,
      maxValue: maxVal + valuePadding
    };
  }, [allData]);

  // Normalize to pixel space
  const normalizeX = (year: number) =>
    ((year - minYear) / (maxYear - minYear)) * size.width;
  const normalizeY = (value: number) =>
    size.height - ((value - minValue) / (maxValue - minValue)) * size.height;

  const segments = (data: { year: number; value: number }[]) =>
    data.length > 1
      ? data.slice(0, -1).map((p, i) => ({
          source: p,
          target: data[i + 1]
        }))
      : [];
      
  const connectionSegment = useMemo(() => {
    if (historicalData.length && forecastData.length) {
      return [
        {
          source: historicalData[historicalData.length - 1],
          target: forecastData[0]
        }
      ];
    }
    return [];
  }, [historicalData, forecastData]);
  
  const handleHover = ({ x, y, object }: any) => {
    if (object && object.source) {
      setHoverInfo({ x, y, year: object.source.year, value: object.source.value });
    } else {
      setHoverInfo(null);
    }
  };

  const layers = [
    new LineLayer({
      id: 'historical',
      data: segments(historicalData),
      getSourcePosition: (d: any) => [
        normalizeX(d.source.year),
        normalizeY(d.source.value)
      ],
      getTargetPosition: (d: any) => [
        normalizeX(d.target.year),
        normalizeY(d.target.value)
      ],
      getColor: [0, 150, 255, 200],
      getWidth: 2,
      pickable: true,
    }),
    new LineLayer({
      id: 'forecast',
      data: [...segments(forecastData), ...connectionSegment],
      getSourcePosition: (d: any) => [
        normalizeX(d.source.year),
        normalizeY(d.source.value)
      ],
      getTargetPosition: (d: any) => [
        normalizeX(d.target.year),
        normalizeY(d.target.value)
      ],
      getColor: [0, 200, 255, 150],
      getWidth: 1.5,
      pickable: true,
    })
  ];

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'visible' }} // Make sure overflow is visible
      className="relative bg-card rounded-lg"
    >
      <DeckGL
        width={size.width}
        height={size.height}
        layers={layers}
        controller={false}
        views={new OrthographicView()}
        viewState={{
          target: [size.width / 2, size.height / 2, 0],
          zoom: 0
        }}
        onHover={handleHover}
        pickable={true}
      />
      {hoverInfo && (
        <div
            className="absolute pointer-events-none text-xs px-2 py-1 rounded bg-black/80 text-white shadow-lg z-10"
            style={{
                left: hoverInfo.x,
                top: hoverInfo.y,
                transform: 'translate(10px, -20px)', // Position it slightly above and to the right of the cursor
            }}
        >
            <div><strong>Year:</strong> {hoverInfo.year}</div>
            <div><strong>Value:</strong> {hoverInfo.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        </div>
      )}
    </div>
  );
};


export default function IndiaMacroDisplay2() {
  const {
    baseGDP, growthRate, startTime,
    basePopulation, populationGrowthRate, basePPP, pppGrowthRate,
    nominalGdpUpdateIntervalMs, pppGdpUpdateIntervalMs,
    imfData, setIMFData,
    isFetchingIMF, setIsFetchingIMF
  } = useIndiaMacroStore();

  const [gdpNow, setGDPNow] = useState(() => calculateGDP(baseGDP, growthRate, startTime));
  const [populationNow, setPopulationNow] = useState(() => calculatePopulation(basePopulation, populationGrowthRate, startTime));
  const [gdpPPPValueNow, setGdpPPPValueNow] = useState(() => calculatePPP(basePPP, pppGrowthRate, startTime));

  useEffect(() => {
    const updateNominalAndPopulation = () => {
      const now = Date.now();
      setGDPNow(calculateGDP(baseGDP, growthRate, startTime, now));
      setPopulationNow(calculatePopulation(basePopulation, populationGrowthRate, startTime, now));
    };
    updateNominalAndPopulation();
    const interval = setInterval(updateNominalAndPopulation, nominalGdpUpdateIntervalMs);
    return () => clearInterval(interval);
  }, [baseGDP, growthRate, basePopulation, populationGrowthRate, startTime, nominalGdpUpdateIntervalMs]);

  useEffect(() => {
    const updatePPPValue = () => {
      const now = Date.now();
      setGdpPPPValueNow(calculatePPP(basePPP, pppGrowthRate, startTime, now));
    };
    updatePPPValue();
    const interval = setInterval(updatePPPValue, pppGdpUpdateIntervalMs);
    return () => clearInterval(interval);
  }, [basePPP, pppGrowthRate, startTime, pppGdpUpdateIntervalMs]);

  const gdpPerCapitaPPP = populationNow > 0 ? gdpPPPValueNow / populationNow : 0;

  const handleFetchIMF = async () => {
    setIsFetchingIMF(true);
    for (const indicator of IMF_INDICATORS_TO_FETCH) {
      try {
        await setIMFData(indicator.code, indicator.label);
        await new Promise(res => setTimeout(res, 300));
      } catch (err) {
        console.error(`Error dispatching fetch for ${indicator.code} (${indicator.label}):`, err);
        await new Promise(res => setTimeout(res, 300));
      }
    }
    setIsFetchingIMF(false);
  };

  return (
    <ScrollArea className="w-full h-full">
      <div className={cn("p-4 w-full flex flex-col space-y-4", systemAppTheme.typography.baseText)}>
        <div>
          <p className={cn(systemAppTheme.typography.statLabel, "tracking-wider uppercase text-center")}>🇮🇳 India Macro Dashboard (deck.gl)</p>
          <div className="text-center mt-1 mb-3">
            <div className={cn(systemAppTheme.typography.statLabel, "mb-0.5 whitespace-nowrap")}>Nominal GDP</div>
            <div className={cn(systemAppTheme.typography.monospace, "text-4xl font-semibold text-card-foreground")}>{formatUSD(gdpNow)}</div>
          </div>
          <div className={cn("grid grid-cols-3 gap-x-3 gap-y-2", systemAppTheme.typography.monospace, "text-xs text-card-foreground")}>
            <div className="text-center">
              <div className={cn(systemAppTheme.typography.statLabel, "mb-0.5 whitespace-nowrap")}>GDP (PPP)</div>
              <div className="text-sm font-semibold">{formatUSD(gdpPPPValueNow)}</div>
            </div>
            <div className="text-center">
              <div className={cn(systemAppTheme.typography.statLabel, "mb-0.5 whitespace-nowrap")}>Population</div>
              <div className="text-sm font-semibold">{formatCompact(populationNow)}</div>
            </div>
            <div className="text-center">
              <div className={cn(systemAppTheme.typography.statLabel, "mb-0.5 whitespace-nowrap")}>GDP/Cap (PPP)</div>
              <div className="text-sm font-semibold">{formatUSD(gdpPerCapitaPPP, 0)}</div>
            </div>
          </div>
        </div>

        <hr className="border-border/60 my-2"/>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className={cn(systemAppTheme.typography.heading, "text-sm")}>IMF Indicators</h3>
            <Button onClick={handleFetchIMF} disabled={isFetchingIMF} size="sm" variant="outline">
              {isFetchingIMF ? "Fetching..." : "Fetch IMF Data"}
            </Button>
          </div>
          {Object.keys(imfData).length === 0 && !isFetchingIMF && (
            <p className="text-xs text-muted-foreground text-center py-4">Click "Fetch IMF Data" to load indicators.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(imfData).map(([code, entry]) => {
              const { label, values } = entry;
              const { historical, forecast } = splitHistoricalAndForecast(values, currentYear);
              const latest = getLatestValue(values);

              let displayValue = "N/A";
              if (latest?.value !== undefined && latest?.value !== null) {
                if (code === 'NGDPD' || code === 'PPPGDP') {
                  const fullValue = latest.value * 1_000_000_000;
                  displayValue = formatCompact(fullValue);
                } else if (code === 'LP') {
                  const fullValue = latest.value * 1_000_000;
                  displayValue = formatCompact(fullValue);
                } else {
                  displayValue = latest.value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
                }
              }
              
              const historicalSliced = historical.slice(-5);
              const forecastSliced = forecast.slice(0, 5);

              return (
                <div
                  key={code}
                  className="bg-background/50 dark:bg-muted/20 rounded-lg p-2 border border-border/50 flex flex-col justify-between"
                >
                  <div>
                    <div className={cn(systemAppTheme.typography.statLabel, "font-medium truncate mb-0.5")}>{label}</div>
                    <div className="text-card-foreground text-sm font-semibold leading-none">
                      {displayValue}
                      {latest?.year && <span className="ml-1 text-muted-foreground text-xs">({latest.year})</span>}
                    </div>
                  </div>

                  <div className="mt-2 h-36">
                    {historicalSliced.length > 0 || forecastSliced.length > 0 ? (
                      <DeckGLChart historicalData={historicalSliced} forecastData={forecastSliced} />
                    ) : (
                      <p className="text-xs text-muted-foreground text-center flex items-center justify-center h-full">No chart data</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
