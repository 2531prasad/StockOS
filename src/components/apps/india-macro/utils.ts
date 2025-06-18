// components/apps/india-macro/utils.ts

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
    maximumFractionDigits: 1, // Compact can have a bit more precision
  };
  if (style === 'currency' && currency) {
    options.style = 'currency';
    options.currency = currency;
  } else {
    options.style = 'decimal'; // Default to decimal for population
  }
  return new Intl.NumberFormat("en-US", options).format(value);
}
