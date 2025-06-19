// components/apps/india-macro/utils.ts
import { imfIndicators } from "./imf-codes";

const MS_IN_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Calculates projected GDP based on base amount, growth rate and elapsed time.
 */
export function calculateGDP(
  base: number,
  rate: number,
  start: number,
  now: number = Date.now()
): number {
  const elapsed = now - start;
  if (elapsed < 0) return base;
  const growthFactor = 1 + rate / 100;
  return base * Math.pow(growthFactor, elapsed / MS_IN_YEAR);
}

/**
 * Calculates projected Population based on base amount, growth rate and elapsed time.
 */
export function calculatePopulation(
  basePop: number,
  growthRate: number,
  start: number,
  now: number = Date.now()
): number {
  const elapsed = now - start;
  if (elapsed < 0) return basePop;
  const growthFactor = 1 + growthRate / 100;
  return basePop * Math.pow(growthFactor, elapsed / MS_IN_YEAR);
}

/**
 * Calculates projected PPP GDP based on base amount, growth rate and elapsed time.
 */
export function calculatePPP(
  basePPPValue: number,
  pppGrowthRateValue: number,
  start: number,
  now: number = Date.now()
): number {
  const elapsed = now - start;
  if (elapsed < 0) return basePPPValue;
  const growthFactor = 1 + pppGrowthRateValue / 100;
  return basePPPValue * Math.pow(growthFactor, elapsed / MS_IN_YEAR);
}


/**
 * Format a number as USD with commas.
 */
export function formatUSD(value: number, maximumFractionDigits: number = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maximumFractionDigits,
  }).format(value);
}

/**
 * Format a number as a compact version (e.g. 1.2T or 1.4B for population)
 */
export function formatCompact(value: number, style: 'decimal' | 'currency' = 'decimal', currency?: string): string {
  const options: Intl.NumberFormatOptions = {
    notation: "compact",
    maximumFractionDigits: 2, // Updated to 2 for more precision e.g. 4.19T
  };
  if (style === 'currency' && currency) {
    options.style = 'currency';
    options.currency = currency;
  } else {
    options.style = 'decimal';
  }
  return new Intl.NumberFormat("en-US", options).format(value);
}

// IMF Data Utilities (processing, not fetching)

export function parseIMFValues(values: Record<string, number> | null): { year: number; value: number }[] {
  if (!values) return [];
  return Object.entries(values)
    .map(([year, value]) => ({ year: +year, value }))
    .sort((a, b) => a.year - b.year);
}

export function splitHistoricalAndForecast(
  values: Record<string, number> | null,
  currentYear = new Date().getFullYear()
) {
  const all = parseIMFValues(values);
  const historical = all.filter((d) => d.year <= currentYear);
  const forecast = all.filter((d) => d.year > currentYear);
  return { historical, forecast, all };
}

export function getLatestValue(values: Record<string, number> | null): { year: number; value: number } | null {
  if (!values) return null;
  const entries = parseIMFValues(values);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

// Definition of IMF indicators to fetch, derived from imf-codes.ts
export const IMF_INDICATORS_TO_FETCH = Object.entries(imfIndicators).map(
  ([code, label]) => ({ code, label })
);