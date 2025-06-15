
export function getPercentile(data: number[], percentile: number): number {
  if (!data.length) return NaN;
  const sorted = data.filter(d => !isNaN(d)).sort((a, b) => a - b);
  if (!sorted.length) return NaN;

  const k = (percentile / 100) * (sorted.length - 1);
  const f = Math.floor(k); 
  const c = Math.ceil(k);  

  if (f === c) {
    return sorted[f];
  }
  
  const valF = sorted[f];
  const valC = sorted[c];

  if (valF === undefined || valC === undefined) {
    return sorted[Math.max(0, Math.min(sorted.length - 1, f))];
  }
  
  return valF + (valC - valF) * (k - f);
}

const formatNumberForBin = (num: number): string => {
    return num.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:1});
}

export function getHistogram(
  data: number[],
  numBins: number,
  mean: number
): { label: string; value: number; isMeanProximal: boolean }[] {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (!validData.length || numBins <= 0) return [];

  const minVal = Math.min(...validData);
  const maxVal = Math.max(...validData);

  if (minVal === maxVal) {
    // Handle cases where all data points are the same
    return [{
        label: `${formatNumberForBin(minVal)}`,
        value: validData.length,
        isMeanProximal: true // If all values are the same, the mean is that value
    }];
  }

  const binWidth = (maxVal - minVal) / numBins;
  const bins: { label: string; value: number; isMeanProximal: boolean, lowerBound: number, upperBound: number }[] = [];

  for (let i = 0; i < numBins; i++) {
    const lowerBound = minVal + i * binWidth;
    const upperBound = minVal + (i + 1) * binWidth;
    bins.push({
      label: `${formatNumberForBin(lowerBound)} - ${formatNumberForBin(upperBound)}`,
      value: 0,
      isMeanProximal: false,
      lowerBound,
      upperBound
    });
  }

  // Ensure the last bin's upper bound correctly captures the maxVal
  if (bins.length > 0) {
      bins[bins.length -1].upperBound = maxVal;
  }


  for (const item of validData) {
    let binIndex = Math.floor((item - minVal) / binWidth);
    // Special handling for the maxVal to ensure it falls into the last bin
    if (item === maxVal) {
      binIndex = numBins - 1;
    }
    // Clamp index to be within bounds
    binIndex = Math.max(0, Math.min(numBins - 1, binIndex)); 
    
    if (bins[binIndex]) {
      bins[binIndex].value++;
    }
  }
  
  if (!isNaN(mean)) {
    bins.forEach(bin => {
        // A bin is mean-proximal if the mean falls within its range.
        // For the last bin, make sure the upper bound comparison is inclusive.
        if (mean >= bin.lowerBound && mean <= bin.upperBound) {
             bin.isMeanProximal = true;
        }
    });
  }
  
  // Sort by bin's lower bound for typical histogram display (lowest bin at bottom if horizontal)
  // Or for chart.js, it might just use the order provided.
  // For horizontal bars (indexAxis: 'y'), higher frequency might be desired at top visually.
  // Let's return them in bin order and let chart.js sort or display as is.
  // If we want higher frequency bars on top for y-axis index:
  // bins.sort((a, b) => b.value - a.value); 
  // Or keep them sorted by bin range
  bins.sort((a, b) => a.lowerBound - b.lowerBound);


  return bins.map(b => ({ label: b.label, value: b.value, isMeanProximal: b.isMeanProximal }));
}


export function getStandardDeviation(data: number[]): number {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (validData.length < 2) return NaN; 
  const meanValue = getMean(validData);
  if (isNaN(meanValue)) return NaN;
  const variance = validData.reduce((acc, val) => acc + Math.pow(val - meanValue, 2), 0) / (validData.length -1); // Sample variance
  return Math.sqrt(variance);
}

export function getMean(data: number[]): number {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (!validData.length) return NaN;
  return validData.reduce((acc, val) => acc + val, 0) / validData.length;
}
