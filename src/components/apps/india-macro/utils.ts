// components/apps/india-macro/utils.ts

const MS_IN_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Calculates projected GDP based on base amount, growth rate and elapsed time.
 */
export function calculateGDP(
  baseGDP: number,
  growthRate: number,
  startTime: number,
  now: number = Date.now()
): number {
  const elapsed = now - startTime;
  if (elapsed < 0) return baseGDP; // Avoid issues if startTime is in future
  const growthFactor = 1 + growthRate / 100;
  return baseGDP * Math.pow(growthFactor, elapsed / MS_IN_YEAR);
}

/**
 * Format a number as USD with commas and 1 decimal point.
 */
export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0, // Typically GDP is shown without cents
  }).format(value);
}

/**
 * Format a number as a compact version (e.g. 1.2T)
 */
export function formatCompactUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2, // Compact can have a bit more precision
  }).format(value);
}
