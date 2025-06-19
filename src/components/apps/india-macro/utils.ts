
// components/apps/india-macro/utils.ts

const MS_IN_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const IMF_API_BASE = "https://www.imf.org/external/datamapper/api/v1";
const COUNTRY_CODE = "IND";

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
    maximumFractionDigits: 1,
  };
  if (style === 'currency' && currency) {
    options.style = 'currency';
    options.currency = currency;
  } else {
    options.style = 'decimal';
  }
  return new Intl.NumberFormat("en-US", options).format(value);
}

// IMF Data Utilities

export async function fetchIMFData(indicatorCode: string): Promise<Record<string, number> | null> {
  const url = `${IMF_API_BASE}/${indicatorCode}/${COUNTRY_CODE}`;
  console.log(`Attempting to fetch IMF data from URL: ${url}`);

  try {
    const res = await fetch(url); // TypeError can occur here

    if (!res.ok) {
      console.error(`IMF API request failed for ${indicatorCode} at ${url}. Status: ${res.status} ${res.statusText}`);
      try {
        const errorBody = await res.text();
        console.error("Error body from IMF API:", errorBody);
      } catch (textError) {
        console.error("Could not retrieve error body from IMF API:", textError);
      }
      return null;
    }

    const json = await res.json(); // SyntaxError can occur here

    if (json && json.values && json.values[indicatorCode] && json.values[indicatorCode][COUNTRY_CODE]) {
      return json.values[indicatorCode][COUNTRY_CODE];
    } else {
      console.warn(`Data structure not as expected for ${indicatorCode} from ${url}. Received:`, json);
      return null;
    }
  } catch (e: any) {
    console.error(`Error during fetch or processing for ${indicatorCode} from ${url}: ${e.message}`, e);
    if (e instanceof TypeError) {
      console.error("This was a TypeError, possibly due to network issues or CORS policy. Ensure the API allows requests from this origin or check network connectivity.");
    } else if (e instanceof SyntaxError) {
      console.error("This was a SyntaxError, meaning the API response was not valid JSON.");
    }
    return null;
  }
}

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

// Definition of IMF indicators we might want to fetch
export const IMF_INDICATORS_TO_FETCH = [
  { code: "NGDP_RPCH", label: "Real GDP Growth (%)" },
  { code: "PCPIPCH", label: "Inflation Rate (%)" },
  { code: "LUR", label: "Unemployment Rate (%)" },
  { code: "GGXWDG_NGDP", label: "Debt (% of GDP)" },
  { code: "BCA_NGDPD", label: "Current Account (% of GDP)"}
];

