// components/apps/india-macro/store.ts
import { create } from "zustand";

type IndiaMacroStore = {
  baseGDP: number;
  growthRate: number;
  startTime: number;

  basePopulation: number;
  populationGrowthRate: number; // e.g., 0.8
  basePPP: number;

  updateBase: (value: number) => void;
  updateGrowth: (value: number) => void;
  updatePopulation: (value: number) => void;
  updatePopulationGrowth: (value: number) => void;
  updatePPP: (value: number) => void;
};

export const useIndiaMacroStore = create<IndiaMacroStore>((set) => ({
  baseGDP: 4011550143837, // Approx. 4.01 Trillion USD
  growthRate: 7.4, // Annual growth rate in %
  startTime: Date.now(),

  basePopulation: 1427108234,
  populationGrowthRate: 0.8, // percent
  basePPP: 13119000000000, // USD PPP

  updateBase: (value) => set({ baseGDP: value, startTime: Date.now() }),
  updateGrowth: (value) => set({ growthRate: value, startTime: Date.now() }), // Also reset startTime
  updatePopulation: (value) => set({ basePopulation: value, startTime: Date.now() }), // Reset startTime for consistency
  updatePopulationGrowth: (value) => set({ populationGrowthRate: value, startTime: Date.now() }), // Reset startTime
  updatePPP: (value) => set({ basePPP: value }), // PPP is static for now, no startTime reset needed unless it becomes dynamic
}));
