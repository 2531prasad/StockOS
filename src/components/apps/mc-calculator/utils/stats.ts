
export interface HistogramDataEntry {
  binStart: number;
  label: string; // e.g., "100.0-110.0"
  probability: number;
  lowerBound: number;
  upperBound: number;
  binCenter: number;
  sigmaCategory: '1' | '2' | '3' | 'other';
}

const formatNumberForBinLabel = (num: number): string => {
    if (isNaN(num)) return "N/A";
    if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(1);
    if (Math.abs(num) >= 1000 || (Math.abs(num) < 1 && num !== 0)) return num.toLocaleString(undefined, {minimumFractionDigits:1, maximumFractionDigits:1});
    return num.toLocaleString(undefined, {minimumFractionDigits:1, maximumFractionDigits:1});
};

export function getHistogram(
  data: number[],
  numBins: number,
  mean: number, // Added mean
  stdDev: number // Added stdDev
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
    const center = minVal;
    let sigmaCat: '1' | '2' | '3' | 'other' = 'other';
    if (!isNaN(mean) && !isNaN(stdDev) && stdDev > 0) {
        const diff = Math.abs(center - mean);
        if (diff <= stdDev) sigmaCat = '1';
        else if (diff <= 2 * stdDev) sigmaCat = '2';
        else if (diff <= 3 * stdDev) sigmaCat = '3';
    } else if (!isNaN(mean) && center === mean ) { // Handle case where stdDev might be 0
        sigmaCat = '1';
    }

    return [{
        binStart: center,
        label: `${formatNumberForBinLabel(center)}`,
        probability: 1,
        lowerBound: center,
        upperBound: center,
        binCenter: center,
        sigmaCategory: sigmaCat,
    }];
  }

  const binWidth = (maxVal - minVal) / numBins;
   if (binWidth <= 0) { 
    const center = (minVal + maxVal) / 2;
    let sigmaCat: '1' | '2' | '3' | 'other' = 'other';
     if (!isNaN(mean) && !isNaN(stdDev) && stdDev > 0) {
        const diff = Math.abs(center - mean);
        if (diff <= stdDev) sigmaCat = '1';
        else if (diff <= 2 * stdDev) sigmaCat = '2';
        else if (diff <= 3 * stdDev) sigmaCat = '3';
    } else if (!isNaN(mean) && center === mean ) {
        sigmaCat = '1';
    }
     return [{
        binStart: minVal,
        label: `${formatNumberForBinLabel(minVal)} - ${formatNumberForBinLabel(maxVal)}`,
        probability: 1,
        lowerBound: minVal,
        upperBound: maxVal,
        binCenter: center,
        sigmaCategory: sigmaCat,
    }];
  }

  const binsFrequencies = Array(numBins).fill(0);
  const binBoundaries: { lower: number, upper: number, center: number }[] = [];

  for (let i = 0; i < numBins; i++) {
    const lower = minVal + i * binWidth;
    const upper = minVal + (i + 1) * binWidth;
    binBoundaries.push({ lower, upper, center: (lower + upper) / 2 });
  }
  
  validData.forEach((val) => {
    let binIndex = Math.floor((val - minVal) / binWidth);
    if (val === maxVal) {
      binIndex = numBins - 1;
    }
    binIndex = Math.max(0, Math.min(numBins - 1, binIndex));
    binsFrequencies[binIndex]++;
  });
  
  const totalDataPoints = validData.length;
  const histogramEntries: HistogramDataEntry[] = [];

  for (let i = 0; i < numBins; i++) {
    const lower = binBoundaries[i].lower;
    const upper = binBoundaries[i].upper;
    const binCenter = binBoundaries[i].center;
    
    let sigmaCat: '1' | '2' | '3' | 'other' = 'other';
    if (!isNaN(mean) && !isNaN(stdDev) && stdDev > 0) {
        const diff = Math.abs(binCenter - mean);
        if (diff <= stdDev) sigmaCat = '1';
        else if (diff <= 2 * stdDev) sigmaCat = '2';
        else if (diff <= 3 * stdDev) sigmaCat = '3';
    } else if (!isNaN(mean) && binCenter >= lower && binCenter <= upper && Math.abs(binCenter-mean) < binWidth/2 && stdDev === 0) { 
        // If stdDev is 0, only the bin containing the mean is '1'
        sigmaCat = '1';
    }


    histogramEntries.push({
        binStart: lower,
        label: `${formatNumberForBinLabel(lower)} - ${formatNumberForBinLabel(upper)}`,
        probability: totalDataPoints > 0 ? binsFrequencies[i] / totalDataPoints : 0,
        lowerBound: lower,
        upperBound: upper,
        binCenter: binCenter,
        sigmaCategory: sigmaCat,
    });
  }
  
  return histogramEntries;
}


export function getPercentile(data: number[], percentile: number): number {
  if (!data.length) return NaN;
  const sorted = data.filter(d => !isNaN(d) && isFinite(d)).sort((a, b) => a - b);
  if (!sorted.length) return NaN;

  const n = sorted.length;
  if (percentile <= 0) return sorted[0];
  if (percentile >= 100) return sorted[n - 1];

  // Using linear interpolation (R-7 method)
  const rank = (percentile / 100) * (n - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }
  
  if (lowerIndex < 0 || upperIndex >= n || lowerIndex >=n || upperIndex < 0) {
     return NaN; 
  }

  const valueLower = sorted[lowerIndex];
  const valueUpper = sorted[upperIndex];
  const fraction = rank - lowerIndex;
  
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
