
export function getPercentile(data: number[], percentile: number): number {
  if (!data.length) return NaN; // Return NaN if no data
  const sorted = data.filter(d => !isNaN(d)).sort((a, b) => a - b); // Filter NaNs before sorting
  if (!sorted.length) return NaN; // Return NaN if no valid data after filtering

  // Ensure index is within bounds, handle edge case of single element array for percentile
  const k = (percentile / 100) * (sorted.length - 1);
  const f = Math.floor(k);
  const c = Math.ceil(k);

  if (f === c) { // Exact match
    return sorted[f];
  }
  // Linear interpolation for non-exact match (optional, simpler is just floor or ceil)
  // Using a simpler approach: take the value at the floored index, or nearest valid for robustness
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(percentile / 100 * (sorted.length -1) )));
  return sorted[index];
}

export function getHistogram(data: number[], binCount = 20): { bin: number; count: number }[] {
  const validData = data.filter(d => !isNaN(d));
  if (!validData.length) return []; // Return empty array if no valid data

  const min = Math.min(...validData);
  const max = Math.max(...validData);
  
  if (min === max) {
    return [{ bin: min, count: validData.length }];
  }

  const step = (max - min) / binCount;
  if (step === 0) { // Avoid infinite loop or division by zero if min somehow equals max after check (e.g. very small differences)
    return [{ bin: min, count: validData.length }];
  }

  const bins = Array(binCount).fill(null).map((_, i) => ({
    bin: min + step * i, // Represents the lower bound of the bin
    count: 0,
  }));

  validData.forEach(val => {
    let binIndex = Math.floor((val - min) / step);
    if (val === max) { // Ensure the max value falls into the last bin
      binIndex = binCount - 1;
    }
    binIndex = Math.max(0, Math.min(binCount - 1, binIndex)); // Clamp index
    bins[binIndex].count++;
  });

  return bins.map(b => ({
    bin: parseFloat(b.bin.toFixed(1)), // Label bin by its lower bound (or center)
    count: b.count
  }));
}

export function getStandardDeviation(data: number[]): number {
  const validData = data.filter(d => !isNaN(d));
  if (validData.length < 2) return NaN; 
  const mean = getMean(validData);
  if (isNaN(mean)) return NaN;
  const variance = validData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (validData.length -1);
  return Math.sqrt(variance);
}

export function getMean(data: number[]): number {
  const validData = data.filter(d => !isNaN(d));
  if (!validData.length) return NaN;
  return validData.reduce((acc, val) => acc + val, 0) / validData.length;
}
