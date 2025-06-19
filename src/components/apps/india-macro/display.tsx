
// components/apps/india-macro/display.tsx
"use client";

import { useEffect, useState } from "react";
import { useIndiaMacroStore } from "./store";
import {
  calculateGDP,
  calculatePopulation,
  calculatePPP,
  formatUSD,
  formatCompact
} from "./utils";
import { systemAppTheme } from "@/components/theme/system-app-theme";
import { cn } from "@/lib/utils";

const UPDATE_INTERVAL_MS = 33.33;

export default function IndiaMacroDisplay() {
  const {
    baseGDP, growthRate, startTime,
    basePopulation, populationGrowthRate, basePPP, pppGrowthRate
  } = useIndiaMacroStore();

  const [gdpNow, setGDPNow] = useState(() => calculateGDP(baseGDP, growthRate, startTime));
  const [populationNow, setPopulationNow] = useState(() => calculatePopulation(basePopulation, populationGrowthRate, startTime));
  const [gdpPPPValueNow, setGdpPPPValueNow] = useState(() => calculatePPP(basePPP, pppGrowthRate, startTime));


  useEffect(() => {
    const updateMetrics = () => {
      const now = Date.now();
      setGDPNow(calculateGDP(baseGDP, growthRate, startTime, now));
      setPopulationNow(calculatePopulation(basePopulation, populationGrowthRate, startTime, now));
      setGdpPPPValueNow(calculatePPP(basePPP, pppGrowthRate, startTime, now));
    };
    
    updateMetrics(); 
    
    const interval = setInterval(updateMetrics, UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [baseGDP, growthRate, basePopulation, populationGrowthRate, basePPP, pppGrowthRate, startTime]);

  const gdpPerCapitaPPP = populationNow > 0 ? gdpPPPValueNow / populationNow : 0;

  return (
    <div className={cn("p-4 w-full h-full flex flex-col justify-center space-y-3", systemAppTheme.typography.baseText)}>
      <p className={cn(systemAppTheme.typography.statLabel, "tracking-wider uppercase text-center")}>🇮🇳 India Macro Dashboard</p>

      <div className="text-center mb-2">
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
  );
}

