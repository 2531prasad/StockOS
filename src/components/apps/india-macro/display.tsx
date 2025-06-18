// components/apps/india-macro/display.tsx
"use client";

import { useEffect, useState } from "react";
import { useIndiaMacroStore } from "./store";
import { calculateGDP, formatUSD } from "./utils"; // Import from utils

// How many milliseconds between each update tick
const UPDATE_INTERVAL_MS = 100;

export default function IndiaMacroDisplay() {
  const { baseGDP, growthRate, startTime } = useIndiaMacroStore();
  const [liveValue, setLiveValue] = useState(() => calculateGDP(baseGDP, growthRate, startTime));

  useEffect(() => {
    // Update liveValue immediately if store values change
    setLiveValue(calculateGDP(baseGDP, growthRate, startTime));

    const interval = setInterval(() => {
      setLiveValue(calculateGDP(baseGDP, growthRate, startTime));
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [baseGDP, growthRate, startTime]);

  return (
    <div className="p-4 bg-zinc-900/80 backdrop-blur-sm text-white rounded-b-lg border-t border-zinc-700/50 shadow-lg w-full h-full flex flex-col items-center justify-center">
      <p className="text-xs text-zinc-400 tracking-wider mb-1 uppercase">India GDP (Live Est.)</p>
      <h1 className="text-3xl font-mono font-semibold tabular-nums text-green-400">
        {formatUSD(liveValue)}
      </h1>
    </div>
  );
}
