
// components/apps/india-macro/utils.ts

const MS_IN_YEAR = 365.25 * 24 * 60 * 60 * 1000;
// const IMF_API_BASE = "https://www.imf.org/external/datamapper/api/v1"; // No longer needed for direct client fetch
// const COUNTRY_CODE = "IND"; // No longer needed for direct client fetch

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
  const proxyUrl = `/api/imf?code=${indicatorCode}`;
  console.log(`Attempting to fetch IMF data via proxy: ${proxyUrl}`);

  try {
    const res = await fetch(proxyUrl);

    if (!res.ok) {
      let errorDetails = `Proxy request failed with status ${res.status}`;
      try {
        const errorJson = await res.json();
        errorDetails += `: ${errorJson.error || 'Unknown proxy error'}${errorJson.details ? ' - ' + errorJson.details : ''}`;
      } catch (jsonError) {
        // If parsing the error JSON fails, use the raw text
        const errorText = await res.text().catch(() => "Could not get error text from proxy response");
        errorDetails += `. Response body: ${errorText}`;
      }
      console.error(`fetchIMFData failed for ${indicatorCode}: ${errorDetails}`);
      return null;
    }

    const json = await res.json();

    if (json && json.values && json.values[indicatorCode] && json.values[indicatorCode]["IND"]) {
      return json.values[indicatorCode]["IND"];
    } else {
      console.warn(`Data structure not as expected for ${indicatorCode} from proxy. Received:`, json);
      return null;
    }
  } catch (e: any) {
    console.error(`Error during fetch or processing for ${indicatorCode} via proxy: ${e.message}`, e);
    if (e instanceof TypeError) {
      console.error("This was a TypeError, possibly due to network issues with the proxy or the proxy itself having issues.");
    } else if (e instanceof SyntaxError) {
      console.error("This was a SyntaxError, meaning the proxy response was not valid JSON.");
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
