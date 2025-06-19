
// components/apps/india-macro/display.tsx
"use client";

import { useEffect, useState } from "react";
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
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";


const currentYear = new Date().getFullYear();

const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/80 backdrop-blur-sm p-2 border border-border rounded-md shadow-lg text-xs">
        <p className="label text-muted-foreground">{`Year: ${label}`}</p>
        {payload.map((pld: any, index: number) => (
          <p key={index} style={{ color: pld.stroke }} className="font-semibold">
            {`${pld.name}: ${pld.value?.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 1 })}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


export default function IndiaMacroDisplay() {
  const {
    baseGDP, growthRate, startTime,
    basePopulation, populationGrowthRate, basePPP, pppGrowthRate,
    nominalGdpUpdateIntervalMs, pppGdpUpdateIntervalMs, // Get new interval values
    imfData, setIMFData, resetIMFData,
    isFetchingIMF, setIsFetchingIMF
  } = useIndiaMacroStore();

  const [gdpNow, setGDPNow] = useState(() => calculateGDP(baseGDP, growthRate, startTime));
  const [populationNow, setPopulationNow] = useState(() => calculatePopulation(basePopulation, populationGrowthRate, startTime));
  const [gdpPPPValueNow, setGdpPPPValueNow] = useState(() => calculatePPP(basePPP, pppGrowthRate, startTime));


  // Effect for Nominal GDP and Population (uses nominalGdpUpdateIntervalMs)
  useEffect(() => {
    const updateNominalAndPopulation = () => {
      const now = Date.now();
      setGDPNow(calculateGDP(baseGDP, growthRate, startTime, now));
      setPopulationNow(calculatePopulation(basePopulation, populationGrowthRate, startTime, now));
    };
    updateNominalAndPopulation(); // Initial call
    const interval = setInterval(updateNominalAndPopulation, nominalGdpUpdateIntervalMs);
    return () => clearInterval(interval);
  }, [baseGDP, growthRate, basePopulation, populationGrowthRate, startTime, nominalGdpUpdateIntervalMs]);

  // Effect for GDP PPP (uses pppGdpUpdateIntervalMs)
  useEffect(() => {
    const updatePPPValue = () => {
      const now = Date.now();
      setGdpPPPValueNow(calculatePPP(basePPP, pppGrowthRate, startTime, now));
    };
    updatePPPValue(); // Initial call
    const interval = setInterval(updatePPPValue, pppGdpUpdateIntervalMs);
    return () => clearInterval(interval);
  }, [basePPP, pppGrowthRate, startTime, pppGdpUpdateIntervalMs]);


  const gdpPerCapitaPPP = populationNow > 0 ? gdpPPPValueNow / populationNow : 0;

  const handleFetchIMF = async () => {
    setIsFetchingIMF(true);
    // resetIMFData(); // Optional: Clears old data before fetching new
    for (const indicator of IMF_INDICATORS_TO_FETCH) {
      try {
        await setIMFData(indicator.code, indicator.label);
        await new Promise(res => setTimeout(res, 300)); // Wait 300ms between triggering fetches
      } catch (err) {
        console.error(`Error dispatching fetch for ${indicator.code} (${indicator.label}):`, err);
        await new Promise(res => setTimeout(res, 300)); // Also wait on error
      }
    }
    setIsFetchingIMF(false);
  };

  return (
    <ScrollArea className="w-full h-full">
    <div className={cn("p-1 w-full flex flex-col space-y-4", systemAppTheme.typography.baseText)}>
      <div>
        <p className={cn(systemAppTheme.typography.statLabel, "tracking-wider uppercase text-center")}>🇮🇳 India Macro Dashboard</p>
        <div className="text-center mt-1 mb-3">
          <div className={cn(systemAppTheme.typography.statLabel, "mb-0.5 whitespace-nowrap")}>Nominal GDP</div>
          <div className={cn(systemAppTheme.typography.monospace, "text-4xl font-semibold text-card-foreground")}>{formatUSD(gdpNow)}</div>
        </div>
        <div className={cn("grid grid-cols-3 gap-x-3 gap-y-2", systemAppTheme.typography.monospace, "text-xs text-card-foreground")}>
          <div className="text-center">
            <div className={cn(systemAppTheme.typography.statLabel, "text-[11px] mb-0.5 whitespace-nowrap")}>GDP (PPP)</div>
            <div className="text-sm font-semibold">{formatUSD(gdpPPPValueNow)}</div>
          </div>
          <div className="text-center">
            <div className={cn(systemAppTheme.typography.statLabel, "text-[11px] mb-0.5 whitespace-nowrap")}>Population</div>
            <div className="text-sm font-semibold">{formatCompact(populationNow)}</div>
          </div>
          <div className="text-center">
            <div className={cn(systemAppTheme.typography.statLabel, "text-[11px] mb-0.5 whitespace-nowrap")}>GDP/Cap (PPP)</div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(imfData).map(([code, entry]) => {
            const { label, values } = entry;
            const { historical, forecast } = splitHistoricalAndForecast(values, currentYear); // Removed 'all' as it was unused
            const latest = getLatestValue(values);

            const chartData = [...historical.slice(-5), ...forecast.slice(0, 5)].map((d) => ({
              year: d.year.toString(),
              value: d.value,
              isFuture: d.year > currentYear,
            }));

            return (
              <div
                key={code}
                className="bg-popover/50 rounded-lg p-1 border border-border flex flex-col justify-between"
              >
                <div>
                  <div className="text-muted-foreground font-medium truncate text-[11px] mb-0.5">{label}</div>
                  <div className="text-card-foreground text-sm font-semibold leading-none">
                    {latest?.value?.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}
                    {latest?.year && <span className="ml-1 text-muted-foreground text-[10px]">({latest.year})</span>}
                  </div>
                </div>

                <div className="mt-2 h-36">
                  {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: -10 }}>
                       <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="year" tick={{ fontSize: 8, fillOpacity: 0.7 }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 8, fillOpacity: 0.7 }} tickLine={false} axisLine={false} domain={['auto', 'auto']}/>
                      <Tooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: '3 3', strokeOpacity: 0.5 }} />
                      <Line
                        name={label.split('(')[0].trim()}
                        type="monotone"
                        dataKey={(d) => (d.isFuture ? null : d.value)}
                        stroke="var(--color-primary)"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        name={label.split('(')[0].trim()}
                        type="monotone"
                        dataKey={(d) => (d.isFuture ? d.value : null)}
                        stroke="var(--color-primary)"
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <ReferenceLine x={currentYear.toString()} stroke="var(--color-accent)" strokeDasharray="2 2" strokeWidth={1} />
                    </LineChart>
                  </ResponsiveContainer>
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
