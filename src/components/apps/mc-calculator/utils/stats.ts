
export function getPercentile(data: number[], percentile: number): number {
  if (!data.length) return NaN;
  const sorted = data.filter(d => !isNaN(d) && isFinite(d)).sort((a, b) => a - b);
  if (!sorted.length) return NaN;

  const index = (percentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  if (lowerIndex < 0 || upperIndex >= sorted.length) {
    if (percentile <= 0) return sorted[0];
    if (percentile >= 100) return sorted[sorted.length - 1];
    return NaN; 
  }
  
  const valueLower = sorted[lowerIndex];
  const valueUpper = sorted[upperIndex];
  
  return valueLower + (valueUpper - valueLower) * (index - lowerIndex);
}

const formatNumberForBin = (num: number): string => {
    if (isNaN(num)) return "N/A";
    if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(1);
    return num.toLocaleString(undefined, {minimumFractionDigits:1, maximumFractionDigits:1});
}

export interface HistogramDataEntry {
  label: string; 
  probability: number; 
  lowerBound: number;
  upperBound: number;
}

export function getHistogram(
  data: number[],
  numBins: number
): HistogramDataEntry[] {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (!validData.length || numBins <= 0) return [];

  const minVal = validData.reduce((min, p) => p < min ? p : min, validData[0]);
  const maxVal = validData.reduce((max, p) => p > max ? p : max, validData[0]);

  if (minVal === maxVal) {
    return [{
        label: `${formatNumberForBin(minVal)}`,
        probability: 1,
        lowerBound: minVal,
        upperBound: minVal,
    }];
  }

  const binWidth = (maxVal - minVal) / numBins;
  if (binWidth <= 0) { 
    console.warn("[getHistogram] binWidth is zero or negative. Data min:", minVal, "max:", maxVal, "numBins:", numBins);
    return [];
  }

  const binsFrequencies = Array(numBins).fill(0);

  validData.forEach((val) => {
    let idx = Math.floor((val - minVal) / binWidth);
    if (idx === numBins) idx = numBins - 1; // Ensure max value falls into the last bin
    idx = Math.max(0, Math.min(numBins - 1, idx)); // Clamp index
    
    if (binsFrequencies[idx] !== undefined) {
      binsFrequencies[idx]++;
    }
  });
  
  const totalDataPoints = validData.length;
  const histogramEntries: HistogramDataEntry[] = [];

  for (let i = 0; i < numBins; i++) {
    const lower = minVal + i * binWidth;
    const upper = minVal + (i + 1) * binWidth;
    histogramEntries.push({
        label: `${formatNumberForBin(lower)} - ${formatNumberForBin(upper)}`,
        probability: totalDataPoints > 0 ? binsFrequencies[i] / totalDataPoints : 0,
        lowerBound: lower,
        upperBound: upper,
    });
  }
  
  return histogramEntries;
}

export function getStandardDeviation(data: number[]): number {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (validData.length < 2) return 0; 
  const meanValue = getMean(validData);
  if (isNaN(meanValue)) return NaN; 
  const variance = validData.reduce((acc, val) => acc + Math.pow(val - meanValue, 2), 0) / (validData.length -1);
  return Math.sqrt(variance);
}

export function getMean(data: number[]): number {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (!validData.length) return NaN;
  return validData.reduce((acc, val) => acc + val, 0) / validData.length;
}
