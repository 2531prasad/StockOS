// components/apps/india-macro/display.tsx
"use client";

import { useEffect, useState } from "react";
import { useIndiaMacroStore } from "./store";
import {
  calculateGDP,
  calculatePopulation,
  formatUSD,
  formatCompact
} from "./utils";

const UPDATE_INTERVAL_MS = 100;

export default function IndiaMacroDisplay() {
  const {
    baseGDP, growthRate, startTime,
    basePopulation, populationGrowthRate, basePPP
  } = useIndiaMacroStore();

  const [gdpNow, setGDPNow] = useState(() => calculateGDP(baseGDP, growthRate, startTime));
  const [populationNow, setPopulationNow] = useState(() => calculatePopulation(basePopulation, populationGrowthRate, startTime));

  useEffect(() => {
    const updateMetrics = () => {
      const now = Date.now();
      setGDPNow(calculateGDP(baseGDP, growthRate, startTime, now));
      setPopulationNow(calculatePopulation(basePopulation, populationGrowthRate, startTime, now));
    };
    
    updateMetrics(); // Initial calculation
    
    const interval = setInterval(updateMetrics, UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [baseGDP, growthRate, basePopulation, populationGrowthRate, startTime]);

  const gdpPPPValue = basePPP; // Static for now
  const gdpPerCapitaPPP = populationNow > 0 ? gdpPPPValue / populationNow : 0;

  return (
    <div className="p-4 bg-zinc-900/80 backdrop-blur-sm text-white rounded-b-lg border-t border-zinc-700/50 shadow-lg w-full h-full flex flex-col justify-center space-y-3">
      <p className="text-xs text-zinc-400 tracking-wider uppercase text-center">🇮🇳 India Macro Dashboard</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono tabular-nums text-sm text-zinc-200">
        <div className="text-center">
          <div className="text-zinc-400 text-xs mb-0.5 whitespace-nowrap">Nominal GDP</div>
          <div className="text-base font-semibold">{formatUSD(gdpNow)}</div>
        </div>

        <div className="text-center">
          <div className="text-zinc-400 text-xs mb-0.5 whitespace-nowrap">GDP (PPP)</div>
          <div className="text-base font-semibold">{formatUSD(gdpPPPValue)}</div>
        </div>

        <div className="text-center">
          <div className="text-zinc-400 text-xs mb-0.5 whitespace-nowrap">Population</div>
          <div className="text-base font-semibold">{formatCompact(populationNow)}</div>
        </div>

        <div className="text-center">
          <div className="text-zinc-400 text-xs mb-0.5 whitespace-nowrap">GDP/Cap (PPP)</div>
          <div className="text-base font-semibold">{formatUSD(gdpPerCapitaPPP, 0)}</div>
        </div>
      </div>
    </div>
  );
}
