// components/apps/india-macro/store.ts
import { create } from "zustand";

type IndiaMacroStore = {
  baseGDP: number;
  growthRate: number;
  startTime: number;
  updateBase: (value: number) => void;
  updateGrowth: (value: number) => void;
};

export const useIndiaMacroStore = create<IndiaMacroStore>((set) => ({
  baseGDP: 4011550143837, // Approx. 4.01 Trillion USD
  growthRate: 7.4, // Annual growth rate in %
  startTime: Date.now(),
  updateBase: (value) => set({ baseGDP: value, startTime: Date.now() }),
  updateGrowth: (value) => set({ growthRate: value, startTime: Date.now() }), // Reset startTime on growth change too for immediate effect
}));
