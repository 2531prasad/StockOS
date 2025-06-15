
export function getPercentile(data: number[], percentile: number): number {
  if (!data.length) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(percentile / 100 * (sorted.length -1) ))); // ensure index is within bounds
  return sorted[index];
}

export function getHistogram(data: number[], binCount = 20): { bin: number; count: number }[] {
  if (!data.length || data.every(isNaN)) return [{ bin: 0, count: 0 }];
  
  const validData = data.filter(d => !isNaN(d));
  if (!validData.length) return [{ bin: 0, count: 0}];

  const min = Math.min(...validData);
  const max = Math.max(...validData);
  
  if (min === max) { // Handle case where all data points are the same
    return [{ bin: min, count: validData.length }];
  }

  const step = (max - min) / binCount;
  const bins = Array(binCount).fill(0).map((_, i) => ({
    bin: min + step * i,
    count: 0,
    lowerBound: min + step * i,
    upperBound: min + step * (i + 1),
  }));

  validData.forEach(val => {
    // Assign to the first bin if it's exactly the min value
    if (val === min) {
        bins[0].count++;
        return;
    }
    // For other values, find the correct bin
    // Ensure that the max value falls into the last bin
    let idx = Math.floor((val - min) / step);
    if (val === max) { // max value goes into the last bin
        idx = binCount - 1;
    } else { // other values
        idx = Math.floor((val - min) / step);
    }
    
    // Clamp index to be within [0, binCount - 1]
    idx = Math.max(0, Math.min(binCount - 1, idx));
    bins[idx].count++;

  });

  return bins.map(b => ({
    bin: parseFloat(b.bin.toFixed(1)), // Or use lowerBound for label
    count: b.count
  }));
}

export function getStandardDeviation(data: number[]): number {
  const validData = data.filter(d => !isNaN(d));
  if (validData.length < 2) return 0;
  const mean = getMean(validData);
  const variance = validData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (validData.length -1); // Sample standard deviation
  return Math.sqrt(variance);
}

export function getMean(data: number[]): number {
  const validData = data.filter(d => !isNaN(d));
  if (!validData.length) return 0;
  return validData.reduce((acc, val) => acc + val, 0) / validData.length;
}
