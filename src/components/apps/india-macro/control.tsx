
// components/apps/india-macro/control.tsx
"use client";

import { useIndiaMacroStore } from "./store";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { systemAppTheme } from "@/components/theme/system-app-theme";
import { cn } from "@/lib/utils";

export default function IndiaMacroControl() {
  const {
    baseGDP, growthRate,
    basePopulation, populationGrowthRate, basePPP, pppGrowthRate, nominalGdpUpdateIntervalMs, // Changed from updateIntervalMs
    updateBase, updateGrowth,
    updatePopulation, updatePopulationGrowth, updatePPP, updatePPPGrowth, updateNominalGdpUpdateIntervalMs // Changed from updateUpdateIntervalMs
  } = useIndiaMacroStore();

  const [localGDP, setLocalGDP] = useState(baseGDP.toString());
  const [localGrowth, setLocalGrowth] = useState(growthRate.toString());
  const [localPop, setLocalPop] = useState(basePopulation.toString());
  const [localPopGrowth, setLocalPopGrowth] = useState(populationGrowthRate.toString());
  const [localPPP, setLocalPPP] = useState(basePPP.toString());
  const [localPPPGrowth, setLocalPPPGrowth] = useState(pppGrowthRate.toString());
  const [localNominalGdpIntervalMs, setLocalNominalGdpIntervalMs] = useState(nominalGdpUpdateIntervalMs.toString()); // Changed state variable name

  useEffect(() => setLocalGDP(baseGDP.toString()), [baseGDP]);
  useEffect(() => setLocalGrowth(growthRate.toString()), [growthRate]);
  useEffect(() => setLocalPop(basePopulation.toString()), [basePopulation]);
  useEffect(() => setLocalPopGrowth(populationGrowthRate.toString()), [populationGrowthRate]);
  useEffect(() => setLocalPPP(basePPP.toString()), [basePPP]);
  useEffect(() => setLocalPPPGrowth(pppGrowthRate.toString()), [pppGrowthRate]);
  useEffect(() => setLocalNominalGdpIntervalMs(nominalGdpUpdateIntervalMs.toString()), [nominalGdpUpdateIntervalMs]); // Updated dependency

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

    const parsedPPPGrowth = parseFloat(localPPPGrowth);
    if (!isNaN(parsedPPPGrowth)) updatePPPGrowth(parsedPPPGrowth);

    const parsedIntervalMs = parseFloat(localNominalGdpIntervalMs); // Use localNominalGdpIntervalMs
    if (!isNaN(parsedIntervalMs) && parsedIntervalMs > 0) updateNominalGdpUpdateIntervalMs(parsedIntervalMs); // Call updated action
  };

  return (
    <div className={cn("p-4 w-full h-full flex flex-col space-y-3 overflow-y-auto", systemAppTheme.typography.baseText)}>
      <h2 className={cn(
          systemAppTheme.typography.heading,
          "text-base text-center border-b border-border pb-2 sticky top-0 bg-card/80 backdrop-blur-sm z-10 pt-1 -mt-1"
        )}
      >
        Macro Controls
      </h2>

      <div className="space-y-1.5">
        <Label htmlFor="baseGDPInput" className={cn("block text-xs", systemAppTheme.typography.statLabel)}>Base GDP (Nominal, USD)</Label>
        <Input
          id="baseGDPInput"
          type="text"
          value={localGDP.includes('.') ? localGDP : formatForDisplay(localGDP)}
          onChange={(e) => handleInputChange(setLocalGDP, e.target.value)}
          onBlur={() => setLocalGDP(formatForDisplay(localGDP.replace(/,/g, '')))}
          onFocus={(e) => setLocalGDP(e.target.value.replace(/,/g, ''))}
          className={cn("w-full h-9 text-sm p-2 rounded border text-right", systemAppTheme.typography.monospace)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="growthRateInput" className={cn("block text-xs", systemAppTheme.typography.statLabel)}>Nominal GDP Growth Rate (%)</Label>
        <Input
          id="growthRateInput"
          type="number"
          value={localGrowth}
          onChange={(e) => setLocalGrowth(e.target.value)}
          className={cn("w-full h-9 text-sm p-2 rounded border text-right", systemAppTheme.typography.monospace)}
          step="0.1"
        />
      </div>

      <hr className="border-border/60 my-2"/>

      <div className="space-y-1.5">
        <Label htmlFor="basePopulationInput" className={cn("block text-xs", systemAppTheme.typography.statLabel)}>Base Population</Label>
        <Input
          id="basePopulationInput"
          type="text"
          value={localPop.includes('.') ? localPop : formatForDisplay(localPop)}
          onChange={(e) => handleInputChange(setLocalPop, e.target.value)}
          onBlur={() => setLocalPop(formatForDisplay(localPop.replace(/,/g, '')))}
          onFocus={(e) => setLocalPop(e.target.value.replace(/,/g, ''))}
          className={cn("w-full h-9 text-sm p-2 rounded border text-right", systemAppTheme.typography.monospace)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="populationGrowthRateInput" className={cn("block text-xs", systemAppTheme.typography.statLabel)}>Population Growth Rate (%)</Label>
        <Input
          id="populationGrowthRateInput"
          type="number"
          value={localPopGrowth}
          onChange={(e) => setLocalPopGrowth(e.target.value)}
          className={cn("w-full h-9 text-sm p-2 rounded border text-right", systemAppTheme.typography.monospace)}
          step="0.01"
        />
      </div>

      <hr className="border-border/60 my-2"/>

      <div className="space-y-1.5">
        <Label htmlFor="basePPPInput" className={cn("block text-xs", systemAppTheme.typography.statLabel)}>Base GDP (PPP, USD)</Label>
        <Input
          id="basePPPInput"
          type="text"
          value={localPPP.includes('.') ? localPPP : formatForDisplay(localPPP)}
          onChange={(e) => handleInputChange(setLocalPPP, e.target.value)}
          onBlur={() => setLocalPPP(formatForDisplay(localPPP.replace(/,/g, '')))}
          onFocus={(e) => setLocalPPP(e.target.value.replace(/,/g, ''))}
          className={cn("w-full h-9 text-sm p-2 rounded border text-right", systemAppTheme.typography.monospace)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pppGrowthRateInput" className={cn("block text-xs", systemAppTheme.typography.statLabel)}>GDP (PPP) Growth Rate (%)</Label>
        <Input
          id="pppGrowthRateInput"
          type="number"
          value={localPPPGrowth}
          onChange={(e) => setLocalPPPGrowth(e.target.value)}
          className={cn("w-full h-9 text-sm p-2 rounded border text-right", systemAppTheme.typography.monospace)}
          step="0.1"
        />
      </div>

      <hr className="border-border/60 my-2"/>

      <div className="space-y-1.5">
        <Label htmlFor="updateIntervalInput" className={cn("block text-xs", systemAppTheme.typography.statLabel)}>Nominal GDP Update Interval (ms)</Label>
        <Input
          id="updateIntervalInput"
          type="number"
          value={localNominalGdpIntervalMs} // Use localNominalGdpIntervalMs
          onChange={(e) => setLocalNominalGdpIntervalMs(e.target.value)} // Update localNominalGdpIntervalMs
          className={cn("w-full h-9 text-sm p-2 rounded border text-right", systemAppTheme.typography.monospace)}
          step="10"
          min="10"
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
