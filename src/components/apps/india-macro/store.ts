
// components/apps/india-macro/store.ts
import { create } from "zustand";

type IMFIndicatorEntry = { // Renamed from IMFIndicator to avoid conflict if another type is named IMFIndicator
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
  nominalGdpUpdateIntervalMs: number; // Renamed from updateIntervalMs
  pppGdpUpdateIntervalMs: number; // New for PPP interval

  // IMF data
  imfData: Record<string, IMFIndicatorEntry>;
  setIMFData: (code: string, label: string) => Promise<void>;
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
  updateNominalGdpUpdateIntervalMs: (value: number) => void; // Renamed from updateUpdateIntervalMs
};

export const useIndiaMacroStore = create<IndiaMacroStore>((set, get) => ({
  baseGDP: 4011550143837,
  growthRate: 7.4,
  basePopulation: 1428000000,
  populationGrowthRate: 0.81,
  basePPP: 13900000000000,
  pppGrowthRate: 6.0,
  startTime: Date.now(),
  nominalGdpUpdateIntervalMs: 200, // Default for Nominal GDP
  pppGdpUpdateIntervalMs: 1000,    // Fixed for GDP PPP

  imfData: {},
  isFetchingIMF: false,
  setIsFetchingIMF: (isFetching) => set({ isFetchingIMF: isFetching }),

  setIMFData: async (code, label) => {
    // get().setIsFetchingIMF(true); // Potentially set fetching for individual indicator
    try {
      const response = await fetch(`/api/imf?code=${code}`);
      if (!response.ok) {
        const errorBody = await response.text().catch(() => `Could not get error text from proxy response for ${code}`);
        console.error(`Error fetching/setting IMF data in store for ${code} (${label}) via proxy: ${response.status}`, errorBody);
        throw new Error(`Proxy request for ${code} failed with status ${response.status}. Response body: ${errorBody}`);
      }
      const rawData = await response.json();

      // Ensure rawData and its nested properties exist before trying to access them
      const values = rawData?.values?.[code]?.["IND"] ?? {};
      set((state) => ({
        imfData: {
          ...state.imfData,
          [code]: { code, label, values },
        },
      }));
    } catch (error: any) {
      console.error(`Error in setIMFData for ${code} (${label}):`, error.message, error);
      // Optionally, update state to reflect the error for this specific indicator
      set((state) => ({
        imfData: {
          ...state.imfData,
          // Keep existing data or mark as error, e.g., by setting values to an error object or empty
          [code]: { code, label, values: state.imfData[code]?.values || {} }, // Keeps old data on error
        },
      }));
    } finally {
      // get().setIsFetchingIMF(false); // Potentially set fetching for individual indicator
    }
  },
  resetIMFData: () => set({ imfData: {}, isFetchingIMF: false }),

  updateBase: (value) => set({ baseGDP: value, startTime: Date.now() }),
  updateGrowth: (value) => set({ growthRate: value, startTime: Date.now() }),
  updatePopulation: (value) => set({ basePopulation: value, startTime: Date.now() }),
  updatePopulationGrowth: (value) => set({ populationGrowthRate: value, startTime: Date.now() }),
  updatePPP: (value) => set({ basePPP: value, startTime: Date.now() }),
  updatePPPGrowth: (value) => set({ pppGrowthRate: value, startTime: Date.now() }),
  updateNominalGdpUpdateIntervalMs: (value) => set({ nominalGdpUpdateIntervalMs: Math.max(10, value), startTime: Date.now() }),
}));
