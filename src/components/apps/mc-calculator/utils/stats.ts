
export function getPercentile(data: number[], percentile: number): number {
  if (!data.length) return NaN;
  const sorted = data.filter(d => !isNaN(d)).sort((a, b) => a - b);
  if (!sorted.length) return NaN;

  // Calculate the 0-based index k
  const k = (percentile / 100) * (sorted.length - 1);
  const f = Math.floor(k); // Floor index
  const c = Math.ceil(k);  // Ceil index

  if (f === c) {
    // If k is an integer, or array has 1 element, or percentile is 0 or 100
    return sorted[f];
  }

  // Linear interpolation
  // Ensure indices are within bounds, though for percentiles 0-100 and sorted.length > 1, they should be.
  const valF = sorted[f];
  const valC = sorted[c];

  if (valF === undefined || valC === undefined) {
    // Fallback for unexpected undefined values (should ideally not happen with proper checks)
    // Return the value at the floored index if it's valid, clamped to array bounds
    return sorted[Math.max(0, Math.min(sorted.length - 1, f))];
  }
  
  return valF + (valC - valF) * (k - f);
}

export function getHistogram( // Name retained for simplicity, but now generates percentile chart data
  data: number[],
  numBars: number,
  mean: number
): { label: string; value: number; originalPercentile: number; isMeanProximal: boolean }[] {
  const validData = data.filter(d => !isNaN(d));
  if (!validData.length || numBars <= 0) return [];

  // getPercentile sorts data internally, so no need to sort validData here.

  const percentileChartEntries: { label: string; value: number; originalPercentile: number; isMeanProximal: boolean }[] = [];
  
  // Store temporary values to find the one closest to mean before formatting labels
  let tempPercentileValues: { percentile: number, val: number }[] = [];

  for (let i = 1; i <= numBars; i++) {
    // Calculate percentile ranks to divide the distribution into numBars points
    const p = (100 / (numBars + 1)) * i;
    const valueAtP = getPercentile(validData, p); 
    if (!isNaN(valueAtP)) {
      tempPercentileValues.push({ percentile: p, val: valueAtP });
    }
  }

  if (!tempPercentileValues.length) return [];

  let closestBarIndex = -1;
  let minMeanDiff = Infinity;

  // Find the percentile value closest to the mean
  if (!isNaN(mean)) {
    tempPercentileValues.forEach((pv, index) => {
      const diff = Math.abs(pv.val - mean);
      if (diff < minMeanDiff) {
        minMeanDiff = diff;
        closestBarIndex = index;
      }
    });
  }

  // Format the final chart entries
  tempPercentileValues.forEach((pv, index) => {
    percentileChartEntries.push({
      label: `${pv.percentile.toLocaleString(undefined, {minimumFractionDigits:1, maximumFractionDigits:1})}% | ${pv.val.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:1})}`,
      value: pv.val,
      originalPercentile: pv.percentile,
      isMeanProximal: index === closestBarIndex,
    });
  });
  
  // Sort by percentile value (descending) for typical display (highest value at top)
  percentileChartEntries.sort((a,b) => b.value - a.value);

  return percentileChartEntries;
}

export function getStandardDeviation(data: number[]): number {
  const validData = data.filter(d => !isNaN(d));
  if (validData.length < 2) return NaN; 
  const meanValue = getMean(validData);
  if (isNaN(meanValue)) return NaN;
  const variance = validData.reduce((acc, val) => acc + Math.pow(val - meanValue, 2), 0) / (validData.length -1);
  return Math.sqrt(variance);
}

export function getMean(data: number[]): number {
  const validData = data.filter(d => !isNaN(d));
  if (!validData.length) return NaN;
  return validData.reduce((acc, val) => acc + val, 0) / validData.length;
}
