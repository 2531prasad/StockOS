
// components/apps/india-macro/store.ts
import { create } from "zustand";

type IMFIndicator = {
  code: string;
  label: string;
  values: Record<string, number>; // Year: Value
};

type IndiaMacroStore = {
  // Live counters
  baseGDP: number;
  growthRate: number;
  basePopulation: number;
  populationGrowthRate: number;
  basePPP: number;
  pppGrowthRate: number;
  startTime: number;
  updateIntervalMs: number;

  // IMF data
  imfData: Record<string, IMFIndicator>;
  setIMFData: (code: string, label: string, values: Record<string, number>) => void;
  resetIMFData: () => void;
  isFetchingIMF: boolean;
  setIsFetchingIMF: (isFetching: boolean) => void;


  // Mutations for live variables
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
  basePopulation: 1428000000, // Example, slightly updated
  populationGrowthRate: 0.81, // Example, slightly updated
  basePPP: 13900000000000,    // Example, slightly updated
  pppGrowthRate: 6.0,         // Example, slightly updated
  startTime: Date.now(),
  updateIntervalMs: 33.33,

  imfData: {},
  isFetchingIMF: false,
  setIsFetchingIMF: (isFetching) => set({ isFetchingIMF: isFetching }),
  setIMFData: (code, label, values) =>
    set((state) => ({
      imfData: {
        ...state.imfData,
        [code]: { code, label, values },
      },
    })),
  resetIMFData: () => set({ imfData: {}, isFetchingIMF: false }),

  updateBase: (value) => set({ baseGDP: value, startTime: Date.now() }),
  updateGrowth: (value) => set({ growthRate: value, startTime: Date.now() }),
  updatePopulation: (value) => set({ basePopulation: value, startTime: Date.now() }),
  updatePopulationGrowth: (value) => set({ populationGrowthRate: value, startTime: Date.now() }),
  updatePPP: (value) => set({ basePPP: value, startTime: Date.now() }),
  updatePPPGrowth: (value) => set({ pppGrowthRate: value, startTime: Date.now() }),
  updateUpdateIntervalMs: (value) => set({ updateIntervalMs: Math.max(10, value), startTime: Date.now() }),
}));

