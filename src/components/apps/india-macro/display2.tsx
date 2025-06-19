
// components/apps/india-macro/display2.tsx
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
import { ScrollArea } from "@/components/ui/scroll-area";

import { Line as ChartJsLine } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartJsTooltipPlugin,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartJsTooltipPlugin,
  Legend,
  Filler,
  annotationPlugin
);

const currentYear = new Date().getFullYear();

// Static colors for Chart.js, approximating the theme for consistency
// Dark theme considerations:
const chartColors = {
  primary: 'hsl(251, 70%, 75%)', // Approx. of oklch(0.7451 0.1356 251.08)
  accent: 'hsl(152, 60%, 80%)',   // Approx. of oklch(0.7969 0.0784 151.96)
  mutedForeground: 'hsla(0, 0%, 80%, 0.7)', // Lighter for dark theme ticks
  gridBorder: 'hsla(0, 0%, 50%, 0.2)',    // Subtle grid
  tooltipBg: 'hsla(0, 0%, 15%, 0.9)',      // Dark tooltip
  tooltipText: 'hsl(0, 0%, 90%)',
};


export default function IndiaMacroDisplay2() {
  const {
    baseGDP, growthRate, startTime,
    basePopulation, populationGrowthRate, basePPP, pppGrowthRate,
    nominalGdpUpdateIntervalMs, pppGdpUpdateIntervalMs,
    imfData, setIMFData, resetIMFData,
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
        <p className={cn(systemAppTheme.typography.statLabel, "tracking-wider uppercase text-center")}>🇮🇳 India Macro Dashboard (Chart.js)</p>
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
            const { historical, forecast, all } = splitHistoricalAndForecast(values, currentYear);
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

            const chartDataForDisplay = [...historical.slice(-5), ...forecast.slice(0, 5)].map((d) => ({
              year: d.year.toString(),
              value: d.value,
              isFuture: d.year > currentYear,
            }));

            const labels = chartDataForDisplay.map(d => d.year);
            const historicalValues = chartDataForDisplay.map(d => d.isFuture ? null : d.value);
            const forecastValues = chartDataForDisplay.map(d => d.isFuture ? d.value : null);
            
            const cleanLabel = label.split('(')[0].trim();

            const chartJsConfig = {
              labels,
              datasets: [
                {
                  label: cleanLabel,
                  data: historicalValues,
                  borderColor: chartColors.primary,
                  borderWidth: 1.5,
                  pointRadius: 0,
                  tension: 0.1,
                  spanGaps: false, // Important for separate historical/forecast lines
                },
                {
                  label: cleanLabel,
                  data: forecastValues,
                  borderColor: chartColors.primary,
                  borderDash: [3, 3],
                  borderWidth: 1.5,
                  pointRadius: 0,
                  tension: 0.1,
                  spanGaps: false,
                }
              ]
            };

            const chartOptions = {
              responsive: true,
              maintainAspectRatio: false,
              animation: false as const,
              scales: {
                x: {
                  ticks: { font: { size: 8 }, color: chartColors.mutedForeground },
                  grid: { display: false },
                },
                y: {
                  ticks: { font: { size: 8 }, color: chartColors.mutedForeground },
                  grid: {
                    color: chartColors.gridBorder,
                    borderDash: [3, 3],
                    drawBorder: false,
                  },
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  enabled: true,
                  mode: 'index' as const,
                  intersect: false,
                  backgroundColor: chartColors.tooltipBg,
                  titleColor: chartColors.tooltipText,
                  bodyColor: chartColors.tooltipText,
                  titleFont: { family: systemAppTheme.typography.monospace.split(' ')[0] }, // Use primary font from theme
                  bodyFont: { family: systemAppTheme.typography.monospace.split(' ')[0] },
                  padding: 8,
                  callbacks: {
                    title: (tooltipItems: any) => `Year: ${tooltipItems[0].label}`,
                    label: (tooltipItem: any) => {
                      const datasetLabel = tooltipItem.dataset.label || 'Value';
                      const value = tooltipItem.parsed.y;
                      if (value !== null) {
                        return `${datasetLabel}: ${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 1 })}`;
                      }
                      return '';
                    }
                  }
                },
                annotation: {
                  annotations: {
                    currentYearLine: {
                      type: 'line' as const,
                      scaleID: 'x',
                      value: currentYear.toString(),
                      borderColor: chartColors.accent,
                      borderWidth: 1,
                      borderDash: [2, 2],
                    }
                  }
                }
              }
            };

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
                  {chartDataForDisplay.length > 0 ? (
                     <ChartJsLine options={chartOptions} data={chartJsConfig} />
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
