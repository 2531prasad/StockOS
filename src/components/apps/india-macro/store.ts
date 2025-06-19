
// components/apps/india-macro/store.ts
import { create } from "zustand";

type IndiaMacroStore = {
  baseGDP: number;
  growthRate: number;
  startTime: number;

  basePopulation: number;
  populationGrowthRate: number; 
  basePPP: number;
  pppGrowthRate: number;
  updateIntervalMs: number;

  updateBase: (value: number) => void;
  updateGrowth: (value: number) => void;
  updatePopulation: (value: number) => void;
  updatePopulationGrowth: (value: number) => void;
  updatePPP: (value: number) => void;
  updatePPPGrowth: (value: number) => void;
  updateUpdateIntervalMs: (value: number) => void;
};

export const useIndiaMacroStore = create<IndiaMacroStore>((set) => ({
  baseGDP: 4011550143837, 
  growthRate: 7.4, 
  startTime: Date.now(),

  basePopulation: 1427108234,
  populationGrowthRate: 0.8, 
  basePPP: 13119000000000, 
  pppGrowthRate: 6.5, 
  updateIntervalMs: 33.33,

  updateBase: (value) => set({ baseGDP: value, startTime: Date.now() }),
  updateGrowth: (value) => set({ growthRate: value, startTime: Date.now() }), 
  updatePopulation: (value) => set({ basePopulation: value, startTime: Date.now() }), 
  updatePopulationGrowth: (value) => set({ populationGrowthRate: value, startTime: Date.now() }), 
  updatePPP: (value) => set({ basePPP: value, startTime: Date.now() }), 
  updatePPPGrowth: (value) => set({ pppGrowthRate: value, startTime: Date.now()}),
  updateUpdateIntervalMs: (value) => set ( anies => ({ updateIntervalMs: Math.max(10, value) })), // Ensure interval is not too low
}));

