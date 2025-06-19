
// components/apps/india-macro/store.ts
import { create } from "zustand";
import { fetchIMFData as fetchIMFDataUtility } from "@/lib/fetchIMFData"; // Renamed import for clarity

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
  setIMFData: (code: string, label: string) => Promise<void>; // Modified signature
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

export const useIndiaMacroStore = create<IndiaMacroStore>((set, get) => ({
  baseGDP: 4011550143837,
  growthRate: 7.4,
  basePopulation: 1428000000, 
  populationGrowthRate: 0.81, 
  basePPP: 13900000000000,    
  pppGrowthRate: 6.0,         
  startTime: Date.now(),
  updateIntervalMs: 33.33,

  imfData: {},
  isFetchingIMF: false,
  setIsFetchingIMF: (isFetching) => set({ isFetchingIMF: isFetching }),
  
  setIMFData: async (code, label) => {
    // No longer setIsFetchingIMF here, handle in component or specific fetch action
    try {
      const rawData = await fetchIMFDataUtility(code, "IND"); // Use the direct fetch utility
      const values = rawData?.values?.[code]?.["IND"] ?? {};
      set((state) => ({
        imfData: {
          ...state.imfData,
          [code]: { code, label, values },
        },
      }));
    } catch (error) {
      console.error(`Error fetching/setting IMF data in store for ${code} (${label}):`, error);
      // Optionally, update state to reflect error for this specific indicator
      set((state) => ({
        imfData: {
          ...state.imfData,
          [code]: { code, label, values: state.imfData[code]?.values || {} }, // Keep old data or empty
        },
      }));
    }
  },
  resetIMFData: () => set({ imfData: {}, isFetchingIMF: false }),

  updateBase: (value) => set({ baseGDP: value, startTime: Date.now() }),
  updateGrowth: (value) => set({ growthRate: value, startTime: Date.now() }),
  updatePopulation: (value) => set({ basePopulation: value, startTime: Date.now() }),
  updatePopulationGrowth: (value) => set({ populationGrowthRate: value, startTime: Date.now() }),
  updatePPP: (value) => set({ basePPP: value, startTime: Date.now() }),
  updatePPPGrowth: (value) => set({ pppGrowthRate: value, startTime: Date.now() }),
  updateUpdateIntervalMs: (value) => set({ updateIntervalMs: Math.max(10, value), startTime: Date.now() }),
}));

