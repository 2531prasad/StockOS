// components/apps/india-macro/display2.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
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
const DeckGLChart = ({ historicalData, forecastData }: { historicalData: { year: number; value: number }[]; forecastData: { year: number; value: number }[] }) => {
  const allData = [...historicalData, ...forecastData];
  
  if (allData.length < 2) {
    return <p className="text-xs text-muted-foreground text-center flex items-center justify-center h-full">Not enough data for chart</p>;
  }

  const { minYear, maxYear, minValue, maxValue, yearSpan, valueSpan } = useMemo(() => {
    const years = allData.map(d => d.year);
    const values = allData.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valueRange = maxVal - minVal;
    
    // Add padding to min/max values for better visualization
    const valuePadding = valueRange === 0 ? 1 : valueRange * 0.1;

    const finalMinYear = Math.min(...years);
    const finalMaxYear = Math.max(...years);

    return {
      minYear: finalMinYear,
      maxYear: finalMaxYear,
      minValue: minVal - valuePadding,
      maxValue: maxVal + valuePadding,
      yearSpan: finalMaxYear - finalMinYear || 1, // Avoid division by zero
      valueSpan: (maxVal + valuePadding) - (minVal - valuePadding) || 1, // Avoid division by zero
    };
  }, [allData]);

  // Create segments for LineLayer
  const historicalSegments = useMemo(() => 
    historicalData.length > 1 ? historicalData.slice(0, -1).map((p, i) => ({
      source: p,
      target: historicalData[i + 1]
    })) : [], [historicalData]);

  const forecastSegments = useMemo(() => 
    forecastData.length > 1 ? forecastData.slice(0, -1).map((p, i) => ({
      source: p,
      target: forecastData[i + 1]
    })) : [], [forecastData]);
  
  // Connect historical to forecast if possible
  const connectionSegment = useMemo(() => {
    if (historicalData.length > 0 && forecastData.length > 0) {
      return [{
        source: historicalData[historicalData.length - 1],
        target: forecastData[0]
      }];
    }
    return [];
  }, [historicalData, forecastData]);

  const layers = [
    new LineLayer({
      id: 'historical-line',
      data: historicalSegments,
      getSourcePosition: (d: any) => [(d.source.year - minYear) / yearSpan, (d.source.value - minValue) / valueSpan],
      getTargetPosition: (d: any) => [(d.target.year - minYear) / yearSpan, (d.target.value - minValue) / valueSpan],
      getColor: [0, 150, 255, 200], // Blue
      getWidth: 2,
      pickable: true,
    }),
    new LineLayer({
      id: 'forecast-line',
      data: [...forecastSegments, ...connectionSegment],
      getSourcePosition: (d: any) => [(d.source.year - minYear) / yearSpan, (d.source.value - minValue) / valueSpan],
      getTargetPosition: (d: any) => [(d.target.year - minYear) / yearSpan, (d.target.value - minValue) / valueSpan],
      getColor: [0, 200, 255, 150], // Lighter Blue
      getWidth: 1.5,
      pickable: true,
    }),
  ];

  const initialViewState = {
      target: [0.5, 0.5, 0],
      zoom: -0.5, // Zoom out slightly to see the 1x1 normalized space with padding
      minZoom: -10,
      maxZoom: 10
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'rgba(10, 20, 30, 0.1)' }}>
      <DeckGL
        layers={layers}
        initialViewState={initialViewState}
        controller={true}
        views={new OrthographicView({id: 'ortho'})}
        getTooltip={({object}: any) => object && object.source && {
          html: `<div style="background-color: #222; color: #fff; padding: 5px; border-radius: 3px; font-family: monospace; font-size: 12px;">
                   <div><strong>Year:</strong> ${object.source.year}</div>
                   <div><strong>Value:</strong> ${object.source.value.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                 </div>`,
          style: {
            backgroundColor: 'transparent',
            border: 'none',
          }
        }}
      />
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
              
              const parsedHistorical = historical.map(d => ({ year: d.year, value: d.value }));
              const parsedForecast = forecast.map(d => ({ year: d.year, value: d.value }));

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
                    <DeckGLChart historicalData={parsedHistorical} forecastData={parsedForecast} />
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
