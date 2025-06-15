
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
    return sorted[Math.max(0, Math.min(sorted.length - 1, Math.round(k)))];
  }
  
  return valF + (valC - valF) * (k - f);
}

const formatNumberForBin = (num: number): string => {
    if (isNaN(num)) return "N/A";
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

  const minVal = Math.min(...validData);
  const maxVal = Math.max(...validData);

  if (minVal === maxVal) {
    let sigmaCat: SigmaCategory = 'other';
    if (!isNaN(mean) && !isNaN(stdDev) && stdDev > 0) {
        const zScore = (minVal - mean) / stdDev;
        if (Math.abs(zScore) <= 1) sigmaCat = '1';
        else if (Math.abs(zScore) <= 2) sigmaCat = '2';
        else if (Math.abs(zScore) <= 3) sigmaCat = '3';
    } else if (!isNaN(mean) && minVal === mean) {
        sigmaCat = '1';
    }
    return [{
        label: `${formatNumberForBin(minVal)}`,
        value: 1, 
        sigmaCategory: sigmaCat,
        lowerBound: minVal,
        upperBound: minVal,
        binCenter: minVal,
    }];
  }

  const binWidth = (maxVal - minVal) / numBins;
  if (binWidth <= 0) { // Should only happen if minVal === maxVal, handled above, but good guard
    console.warn("[getHistogram] binWidth is zero or negative. Data min:", minVal, "max:", maxVal, "numBins:", numBins);
    return [];
  }


  const bins: { 
    label: string; 
    frequency: number; 
    lowerBound: number; 
    upperBound: number;
    binCenter: number;
    sigmaCategory: SigmaCategory;
    pdfValue: number;
  }[] = [];

  for (let i = 0; i < numBins; i++) {
    const lowerBound = minVal + i * binWidth;
    const upperBound = minVal + (i + 1) * binWidth;
    bins.push({
      label: `${formatNumberForBin(lowerBound)} - ${formatNumberForBin(upperBound)}`,
      frequency: 0,
      lowerBound,
      upperBound,
      binCenter: (lowerBound + upperBound) / 2,
      sigmaCategory: 'other',
      pdfValue: 0,
    });
  }
  
  // Ensure the last bin's upper bound is exactly maxVal to catch all values.
  if (bins.length > 0) {
      bins[bins.length -1].upperBound = maxVal; 
      // Recalculate label and binCenter for the last bin if its upperBound changed significantly
      const lastBin = bins[bins.length-1];
      lastBin.label = `${formatNumberForBin(lastBin.lowerBound)} - ${formatNumberForBin(lastBin.upperBound)}`;
      lastBin.binCenter = (lastBin.lowerBound + lastBin.upperBound) / 2;
  }


  for (const item of validData) {
    let binIndex = Math.floor((item - minVal) / binWidth);
    // Special case for the max value to ensure it falls into the last bin
    if (item === maxVal) {
      binIndex = numBins - 1;
    }
    binIndex = Math.max(0, Math.min(numBins - 1, binIndex)); 
    
    if (bins[binIndex]) {
      bins[binIndex].frequency++;
    } else {
       // This should not happen if binIndex calculation and guards are correct
       console.warn(`[getHistogram] No bin found for item: ${item}, calculated binIndex: ${binIndex}. Total bins: ${numBins}`);
    }
  }
  
  const totalDataPoints = validData.length;

  bins.forEach(bin => {
    if (totalDataPoints > 0 && binWidth > 0) {
        bin.pdfValue = bin.frequency / (totalDataPoints * binWidth);
    } else {
        bin.pdfValue = 0;
    }

    if (!isNaN(mean) && !isNaN(stdDev) && stdDev > 0) {
        const zScore = (bin.binCenter - mean) / stdDev;
        if (Math.abs(zScore) <= 1) bin.sigmaCategory = '1';
        else if (Math.abs(zScore) <= 2) bin.sigmaCategory = '2';
        else if (Math.abs(zScore) <= 3) bin.sigmaCategory = '3';
        else bin.sigmaCategory = 'other';
    } else if (!isNaN(mean) && bin.binCenter >= mean && bin.binCenter <= mean && (stdDev === 0 || isNaN(stdDev)) ) {
        bin.sigmaCategory = '1';
    } else {
        bin.sigmaCategory = 'other';
    }
  });
  
  // No sorting by lowerBound needed as bins are created in order

  return bins.map(b => ({ 
    label: b.label, 
    value: b.pdfValue, 
    sigmaCategory: b.sigmaCategory,
    lowerBound: b.lowerBound,
    upperBound: b.upperBound,
    binCenter: b.binCenter
  }));
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
