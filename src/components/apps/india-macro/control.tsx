// components/apps/india-macro/control.tsx
"use client";

import { useIndiaMacroStore } from "./store";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function IndiaMacroControl() {
  const {
    baseGDP, growthRate,
    basePopulation, populationGrowthRate, basePPP,
    updateBase, updateGrowth,
    updatePopulation, updatePopulationGrowth, updatePPP
  } = useIndiaMacroStore();

  const [localGDP, setLocalGDP] = useState(baseGDP.toString());
  const [localGrowth, setLocalGrowth] = useState(growthRate.toString());
  const [localPop, setLocalPop] = useState(basePopulation.toString());
  const [localPopGrowth, setLocalPopGrowth] = useState(populationGrowthRate.toString());
  const [localPPP, setLocalPPP] = useState(basePPP.toString());

  useEffect(() => setLocalGDP(baseGDP.toString()), [baseGDP]);
  useEffect(() => setLocalGrowth(growthRate.toString()), [growthRate]);
  useEffect(() => setLocalPop(basePopulation.toString()), [basePopulation]);
  useEffect(() => setLocalPopGrowth(populationGrowthRate.toString()), [populationGrowthRate]);
  useEffect(() => setLocalPPP(basePPP.toString()), [basePPP]);

  const formatForDisplay = (numStr: string) => {
    const num = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(num)) return numStr;
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    if (/^[\d,]*\.?\d*$/.test(value) || value === "") {
       setter(value);
    }
  };

  const handleUpdate = () => {
    const cleanAndParse = (val: string) => parseFloat(val.replace(/,/g, ""));
    
    const parsedGDP = cleanAndParse(localGDP);
    if (!isNaN(parsedGDP) && parsedGDP > 0) updateBase(parsedGDP);

    const parsedGrowth = parseFloat(localGrowth);
    if (!isNaN(parsedGrowth)) updateGrowth(parsedGrowth);
    
    const parsedPop = cleanAndParse(localPop);
    if (!isNaN(parsedPop) && parsedPop > 0) updatePopulation(parsedPop);

    const parsedPopGrowth = parseFloat(localPopGrowth);
    if (!isNaN(parsedPopGrowth)) updatePopulationGrowth(parsedPopGrowth);

    const parsedPPP = cleanAndParse(localPPP);
    if (!isNaN(parsedPPP) && parsedPPP > 0) updatePPP(parsedPPP);
  };
  
  return (
    <div className="p-4 bg-zinc-900/80 backdrop-blur-sm text-white rounded-b-lg border-t border-zinc-700/50 shadow w-full h-full flex flex-col space-y-3 overflow-y-auto">
      <h2 className="text-base font-semibold text-zinc-300 text-center border-b border-zinc-700/80 pb-2 sticky top-0 bg-zinc-900/80 z-10 pt-1 -mt-1">Macro Controls</h2>

      <div className="space-y-1.5">
        <Label htmlFor="baseGDPInput" className="block text-xs text-zinc-400">Base GDP (Nominal, USD)</Label>
        <Input
          id="baseGDPInput"
          type="text"
          value={localGDP.includes('.') ? localGDP : formatForDisplay(localGDP)}
          onChange={(e) => handleInputChange(setLocalGDP, e.target.value)}
          onBlur={() => setLocalGDP(formatForDisplay(localGDP.replace(/,/g, '')))}
          onFocus={(e) => setLocalGDP(e.target.value.replace(/,/g, ''))}
          className="w-full h-9 text-sm p-2 rounded bg-zinc-800 border-zinc-600 font-mono text-right"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="growthRateInput" className="block text-xs text-zinc-400">Nominal GDP Growth Rate (%)</Label>
        <Input
          id="growthRateInput"
          type="number"
          value={localGrowth}
          onChange={(e) => setLocalGrowth(e.target.value)}
          className="w-full h-9 text-sm p-2 rounded bg-zinc-800 border-zinc-600 font-mono text-right"
          step="0.1"
        />
      </div>
      
      <hr className="border-zinc-700/60 my-2"/>

      <div className="space-y-1.5">
        <Label htmlFor="basePopulationInput" className="block text-xs text-zinc-400">Base Population</Label>
        <Input
          id="basePopulationInput"
          type="text"
          value={localPop.includes('.') ? localPop : formatForDisplay(localPop)}
          onChange={(e) => handleInputChange(setLocalPop, e.target.value)}
          onBlur={() => setLocalPop(formatForDisplay(localPop.replace(/,/g, '')))}
          onFocus={(e) => setLocalPop(e.target.value.replace(/,/g, ''))}
          className="w-full h-9 text-sm p-2 rounded bg-zinc-800 border-zinc-600 font-mono text-right"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="populationGrowthRateInput" className="block text-xs text-zinc-400">Population Growth Rate (%)</Label>
        <Input
          id="populationGrowthRateInput"
          type="number"
          value={localPopGrowth}
          onChange={(e) => setLocalPopGrowth(e.target.value)}
          className="w-full h-9 text-sm p-2 rounded bg-zinc-800 border-zinc-600 font-mono text-right"
          step="0.01"
        />
      </div>
      
      <hr className="border-zinc-700/60 my-2"/>

      <div className="space-y-1.5">
        <Label htmlFor="basePPPInput" className="block text-xs text-zinc-400">Base GDP (PPP, USD)</Label>
        <Input
          id="basePPPInput"
          type="text"
          value={localPPP.includes('.') ? localPPP : formatForDisplay(localPPP)}
          onChange={(e) => handleInputChange(setLocalPPP, e.target.value)}
          onBlur={() => setLocalPPP(formatForDisplay(localPPP.replace(/,/g, '')))}
          onFocus={(e) => setLocalPPP(e.target.value.replace(/,/g, ''))}
          className="w-full h-9 text-sm p-2 rounded bg-zinc-800 border-zinc-600 font-mono text-right"
        />
      </div>
      
      <div className="mt-auto pt-2">
        <Button
          onClick={handleUpdate}
          variant="outline"
          className="bg-primary hover:bg-primary/90 transition text-primary-foreground py-2 px-4 rounded w-full text-sm h-9"
        >
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
