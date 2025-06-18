// components/apps/india-macro/control.tsx
"use client";

import { useIndiaMacroStore } from "./store";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function IndiaMacroControl() {
  const {
    baseGDP,
    growthRate,
    updateBase,
    updateGrowth
  } = useIndiaMacroStore();

  // Use local state for form inputs to control them independently
  const [localGDP, setLocalGDP] = useState(baseGDP.toString());
  const [localGrowth, setLocalGrowth] = useState(growthRate.toString());

  // Sync local state if store changes externally (e.g. if we add a "reset" or load from elsewhere)
  useEffect(() => {
    setLocalGDP(baseGDP.toString());
  }, [baseGDP]);

  useEffect(() => {
    setLocalGrowth(growthRate.toString());
  }, [growthRate]);

  const handleUpdate = () => {
    const parsedGDP = parseFloat(localGDP.replace(/[^0-9.]/g, ""));
    const parsedGrowth = parseFloat(localGrowth);
    if (!isNaN(parsedGDP) && parsedGDP > 0) updateBase(parsedGDP);
    if (!isNaN(parsedGrowth)) updateGrowth(parsedGrowth);
  };
  
  const handleBaseGDPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     // Allow numbers, commas, and one decimal point
    if (/^[\d,]*\.?\d*$/.test(value) || value === "") {
       setLocalGDP(value);
    }
  };

  const formatForDisplay = (numStr: string) => {
    const num = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(num)) return numStr; // Return original string if not a valid number after stripping commas
    return new Intl.NumberFormat('en-US').format(num);
  };


  return (
    <div className="p-4 bg-zinc-900/80 backdrop-blur-sm text-white rounded-b-lg border-t border-zinc-700/50 shadow w-full h-full flex flex-col space-y-4">
      <h2 className="text-base font-semibold text-zinc-300 text-center border-b border-zinc-700 pb-2">Macro Controls</h2>

      <div className="space-y-2">
        <Label htmlFor="baseGDPInput" className="block text-xs text-zinc-400">Base GDP (USD)</Label>
        <Input
          id="baseGDPInput"
          type="text"
          value={localGDP.includes('.') ? localGDP : formatForDisplay(localGDP)}
          onChange={handleBaseGDPChange}
          onBlur={() => setLocalGDP(formatForDisplay(localGDP.replace(/,/g, '')))}
          onFocus={(e) => setLocalGDP(e.target.value.replace(/,/g, ''))}
          className="w-full h-9 text-sm p-2 rounded bg-zinc-800 border-zinc-600 focus:ring-orange-500 font-mono text-right"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="growthRateInput" className="block text-xs text-zinc-400">Annual Growth Rate (%)</Label>
        <Input
          id="growthRateInput"
          type="number"
          value={localGrowth}
          onChange={(e) => setLocalGrowth(e.target.value)}
          className="w-full h-9 text-sm p-2 rounded bg-zinc-800 border-zinc-600 focus:ring-orange-500 font-mono text-right"
          step="0.1"
        />
      </div>

      <Button
        onClick={handleUpdate}
        variant="outline"
        className="bg-orange-600 hover:bg-orange-700 transition text-white py-2 px-4 rounded w-full text-sm h-9 mt-auto"
      >
        Apply Changes
      </Button>
    </div>
  );
}
