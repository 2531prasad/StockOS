
export function getPercentile(data: number[], percentile: number): number {
  if (!data.length) return NaN;
  const sorted = data.filter(d => !isNaN(d) && isFinite(d)).sort((a, b) => a - b);
  if (!sorted.length) return NaN;

  // Using a common linear interpolation method (R-7 in R, Excel's PERCENTILE.INC)
  const index = (percentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  // Check if indices are out of bounds (should not happen if data is present)
  if (lowerIndex < 0 || upperIndex >= sorted.length) {
    // Fallback for extreme percentiles if array is very small, though generally handled by above checks.
    // This typically means percentile is 0 or 100 for single element array or empty valid array.
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
    // Adjust formatting for clarity, especially for small or large numbers
    if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(1);
    return num.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:1});
}

export type SigmaCategory = '1' | '2' | '3' | 'other';

export interface HistogramDataEntry {
  label: string; // Bin range label e.g., "100-120"
  value: number; // PDF value for that bin
  sigmaCategory: SigmaCategory;
  lowerBound: number;
  upperBound: number;
  binCenter: number;
}


export function getHistogram(
  data: number[],
  numBins: number,
  mean: number,
  stdDev: number
): HistogramDataEntry[] {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (!validData.length || numBins <= 0) return [];

  const minVal = validData.reduce((min, p) => p < min ? p : min, validData[0]);
  const maxVal = validData.reduce((max, p) => p > max ? p : max, validData[0]);


  if (minVal === maxVal) {
    // Handle case where all data points are the same
    let sigmaCat: SigmaCategory = 'other';
    if (!isNaN(mean) && !isNaN(stdDev) && stdDev > 0) {
        const zScore = (minVal - mean) / stdDev;
        if (Math.abs(zScore) <= 1) sigmaCat = '1';
        else if (Math.abs(zScore) <= 2) sigmaCat = '2';
        else if (Math.abs(zScore) <= 3) sigmaCat = '3';
    } else if (!isNaN(mean) && minVal === mean && (stdDev === 0 || isNaN(stdDev))) {
        // If stdDev is 0 and minVal is the mean, it's within 1 sigma.
        sigmaCat = '1';
    }
    return [{
        label: `${formatNumberForBin(minVal)}`,
        value: 1, // PDF is 1 if all data is in one point (or treated as such for histogram of single value)
        sigmaCategory: sigmaCat,
        lowerBound: minVal,
        upperBound: minVal,
        binCenter: minVal,
    }];
  }

  const binWidth = (maxVal - minVal) / numBins;
  if (binWidth <= 0) { 
    console.warn("[getHistogram] binWidth is zero or negative. Data min:", minVal, "max:", maxVal, "numBins:", numBins);
    return []; // Should be caught by minVal === maxVal, but defensive
  }


  const bins: { 
    frequency: number; 
    lowerBound: number; 
    upperBound: number;
    binCenter: number;
  }[] = [];

  for (let i = 0; i < numBins; i++) {
    const lowerBound = minVal + i * binWidth;
    const upperBound = minVal + (i + 1) * binWidth;
    bins.push({
      frequency: 0,
      lowerBound,
      upperBound,
      binCenter: (lowerBound + upperBound) / 2,
    });
  }
  
  // Ensure the last bin's upper bound is exactly maxVal to catch all values.
  if (bins.length > 0) {
      bins[bins.length -1].upperBound = maxVal; 
      bins[bins.length-1].binCenter = (bins[bins.length-1].lowerBound + bins[bins.length-1].upperBound) / 2;
  }


  for (const item of validData) {
    let binIndex = Math.floor((item - minVal) / binWidth);
    // Special case for the max value to ensure it falls into the last bin
    if (item === maxVal) {
      binIndex = numBins - 1;
    }
    binIndex = Math.max(0, Math.min(numBins - 1, binIndex)); // Clamp index
    
    if (bins[binIndex]) {
      bins[binIndex].frequency++;
    }
  }
  
  const totalDataPoints = validData.length;
  const histogramEntries: HistogramDataEntry[] = [];

  bins.forEach(bin => {
    let pdfValue = 0;
    if (totalDataPoints > 0 && binWidth > 0) {
        pdfValue = bin.frequency / (totalDataPoints * binWidth);
    }

    let sigmaCategory: SigmaCategory = 'other';
    if (!isNaN(mean) && !isNaN(stdDev) && stdDev > 0) {
        const zScore = (bin.binCenter - mean) / stdDev;
        if (Math.abs(zScore) <= 1) sigmaCategory = '1';
        else if (Math.abs(zScore) <= 2) sigmaCategory = '2';
        else if (Math.abs(zScore) <= 3) sigmaCategory = '3';
    } else if (!isNaN(mean) && bin.binCenter >= mean && bin.binCenter <= mean && (stdDev === 0 || isNaN(stdDev)) ) {
        // If stdDev is 0 (or NaN due to single value) and binCenter is the mean
        sigmaCategory = '1';
    }
    
    histogramEntries.push({
        label: `${formatNumberForBin(bin.lowerBound)} - ${formatNumberForBin(bin.upperBound)}`,
        value: pdfValue,
        sigmaCategory,
        lowerBound: bin.lowerBound,
        upperBound: bin.upperBound,
        binCenter: bin.binCenter
    });
  });
  
  return histogramEntries;
}


export function getStandardDeviation(data: number[]): number {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (validData.length < 2) return 0; 
  const meanValue = getMean(validData);
  if (isNaN(meanValue)) return NaN; 
  const variance = validData.reduce((acc, val) => acc + Math.pow(val - meanValue, 2), 0) / (validData.length -1); // Sample variance (n-1)
  return Math.sqrt(variance);
}

export function getMean(data: number[]): number {
  const validData = data.filter(d => !isNaN(d) && isFinite(d));
  if (!validData.length) return NaN;
  return validData.reduce((acc, val) => acc + val, 0) / validData.length;
}

