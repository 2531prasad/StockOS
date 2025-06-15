
export interface HistogramDataEntry {
  binStart: number;
  label: string; // e.g., "100.0-110.0"
  probability: number;
  lowerBound: number;
  upperBound: number;
  binCenter: number;
}

const formatNumberForBinLabel = (num: number): string => {
    if (isNaN(num)) return "N/A";
    // Adjust precision based on the magnitude of the number
    if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(1);
    if (Math.abs(num) >= 1000 || Math.abs(num) < 1) return num.toLocaleString(undefined, {minimumFractionDigits:1, maximumFractionDigits:1});
    return num.toLocaleString(undefined, {minimumFractionDigits:1, maximumFractionDigits:1});
};

export function getHistogram(
  data: number[],
  numBins: number,
  // mean and stdDev are no longer needed here for sigma coloring of bars
): HistogramDataEntry[] {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (!validData.length || numBins <= 0) return [];

  let minVal = validData[0];
  let maxVal = validData[0];
  for (let i = 1; i < validData.length; i++) {
    if (validData[i] < minVal) minVal = validData[i];
    if (validData[i] > maxVal) maxVal = validData[i];
  }
  
  if (minVal === maxVal) {
    // Handle case where all data points are the same
    const center = minVal;
    return [{
        binStart: center,
        label: `${formatNumberForBinLabel(center)}`,
        probability: 1,
        lowerBound: center,
        upperBound: center,
        binCenter: center,
    }];
  }

  const binWidth = (maxVal - minVal) / numBins;
   if (binWidth <= 0) { 
    // This can happen if maxVal is very close to minVal, effectively making them equal for `numBins`
    // Or if numBins is extremely large.
    // Fallback to a single bin representing the range.
    const center = (minVal + maxVal) / 2;
     return [{
        binStart: minVal,
        label: `${formatNumberForBinLabel(minVal)} - ${formatNumberForBinLabel(maxVal)}`,
        probability: 1,
        lowerBound: minVal,
        upperBound: maxVal,
        binCenter: center,
    }];
  }


  const binsFrequencies = Array(numBins).fill(0);
  const binBoundaries: { lower: number, upper: number }[] = [];

  for (let i = 0; i < numBins; i++) {
    const lower = minVal + i * binWidth;
    const upper = minVal + (i + 1) * binWidth;
    binBoundaries.push({ lower, upper });
  }
  
  validData.forEach((val) => {
    let binIndex = Math.floor((val - minVal) / binWidth);
    // For values exactly equal to maxVal, they should fall into the last bin
    if (val === maxVal) {
      binIndex = numBins - 1;
    }
    // Clamp index to be within [0, numBins - 1]
    binIndex = Math.max(0, Math.min(numBins - 1, binIndex));
    binsFrequencies[binIndex]++;
  });
  
  const totalDataPoints = validData.length;
  const histogramEntries: HistogramDataEntry[] = [];

  for (let i = 0; i < numBins; i++) {
    const lower = binBoundaries[i].lower;
    const upper = binBoundaries[i].upper;
    histogramEntries.push({
        binStart: lower,
        label: `${formatNumberForBinLabel(lower)} - ${formatNumberForBinLabel(upper)}`,
        probability: totalDataPoints > 0 ? binsFrequencies[i] / totalDataPoints : 0,
        lowerBound: lower,
        upperBound: upper,
        binCenter: (lower + upper) / 2,
    });
  }
  
  return histogramEntries;
}


export function getPercentile(data: number[], percentile: number): number {
  if (!data.length) return NaN;
  const sorted = data.filter(d => !isNaN(d) && isFinite(d)).sort((a, b) => a - b);
  if (!sorted.length) return NaN;

  // Using the R-7 method (Excel's PERCENTILE.INC, Python numpy.percentile default)
  const n = sorted.length;
  if (percentile <= 0) return sorted[0];
  if (percentile >= 100) return sorted[n - 1];

  const rank = (percentile / 100) * (n - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const fraction = rank - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }
  
  if (lowerIndex < 0 || upperIndex >= n) { // Should be caught by earlier checks but good for safety
     return NaN;
  }

  const valueLower = sorted[lowerIndex];
  const valueUpper = sorted[upperIndex];
  
  return valueLower + (valueUpper - valueLower) * fraction;
}


export function getStandardDeviation(data: number[]): number {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (validData.length < 2) return 0; 
  const meanValue = getMean(validData);
  if (isNaN(meanValue)) return NaN; 
  const variance = validData.reduce((acc, val) => acc + Math.pow(val - meanValue, 2), 0) / (validData.length -1); // sample std dev
  return Math.sqrt(variance);
}

export function getMean(data: number[]): number {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (!validData.length) return NaN;
  return validData.reduce((acc, val) => acc + val, 0) / validData.length;
}
