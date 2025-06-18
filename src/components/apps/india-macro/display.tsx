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

const UPDATE_INTERVAL_MS = 100;

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
    <div className="p-4 bg-zinc-900/80 backdrop-blur-sm text-white rounded-b-lg border-t border-zinc-700/50 shadow-lg w-full h-full flex flex-col justify-center space-y-3">
      <p className="text-xs text-zinc-400 tracking-wider uppercase text-center">🇮🇳 India Macro Dashboard</p>

      <div className="text-center mb-2">
        <div className="text-zinc-400 text-xs mb-0.5 whitespace-nowrap">Nominal GDP</div>
        <div className="text-2xl font-mono font-semibold tabular-nums text-zinc-100">{formatUSD(gdpNow)}</div>
      </div>

      <div className="grid grid-cols-3 gap-x-3 gap-y-2 font-mono tabular-nums text-xs text-zinc-200">
        <div className="text-center">
          <div className="text-zinc-400 text-[11px] mb-0.5 whitespace-nowrap">GDP (PPP)</div>
          <div className="text-sm font-semibold">{formatUSD(gdpPPPValueNow)}</div>
        </div>

        <div className="text-center">
          <div className="text-zinc-400 text-[11px] mb-0.5 whitespace-nowrap">Population</div>
          <div className="text-sm font-semibold">{formatCompact(populationNow)}</div>
        </div>

        <div className="text-center">
          <div className="text-zinc-400 text-[11px] mb-0.5 whitespace-nowrap">GDP/Cap (PPP)</div>
          <div className="text-sm font-semibold">{formatUSD(gdpPerCapitaPPP, 0)}</div>
        </div>
      </div>
    </div>
  );
}
