
import { useState, useEffect } from 'react';
import { preprocessExpression, type ProcessedExpression } from "../utils/expressionParser";
import { runSimulation, evaluateDeterministic } from "../utils/monteCarlo";
import { getPercentile, getHistogram, getStandardDeviation, getMean, type HistogramDataEntry } from "../utils/stats";

export interface CalculatorResults {
  results: number[];
  min: number;
  max: number;
  mean: number;
  stdDev: number;
  p5: number;
  p10: number;
  p50: number; // Median
  p90: number;
  p95: number;
  histogram: HistogramDataEntry[]; // This now uses the refined HistogramDataEntry from stats.ts
  error: string | null;
  isDeterministic: boolean;
  expressionUsed: string;
}

const defaultInitialResults: CalculatorResults = {
  results: [],
  min: NaN,
  max: NaN,
  mean: NaN,
  stdDev: NaN,
  p5: NaN,
  p10: NaN,
  p50: NaN,
  p90: NaN,
  p95: NaN,
  histogram: [],
  error: null,
  isDeterministic: false,
  expressionUsed: "",
};


export function useCalculator(submittedExpression: string, iterations: number = 10000, histogramBinCount: number = 23): CalculatorResults {
  const [data, setData] = useState<CalculatorResults>(defaultInitialResults);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  useEffect(() => {
    if (!isClient || !submittedExpression) { 
      if (!submittedExpression && data.expressionUsed) {
         // Clear results but keep expressionUsed if clearing input after a calculation
         setData(prev => ({...defaultInitialResults, expressionUsed: prev.expressionUsed}));
      } else if (!submittedExpression) {
        // Truly initial state or expression explicitly cleared before any calculation
        setData(defaultInitialResults);
      }
      return;
    }

    let currentResults: number[] = [];
    let error: string | null = null;
    let isDeterministicCalculation = false;
    let processedData: ProcessedExpression | null = null;
    

    try {
      processedData = preprocessExpression(submittedExpression);
      
      if (processedData.error) {
        error = processedData.error;
      } else {
        isDeterministicCalculation = !processedData.isProbabilistic;

        if (isDeterministicCalculation) {
            const evalResult = evaluateDeterministic(processedData.expression);
            if (typeof evalResult === 'number' && isFinite(evalResult)) {
              currentResults = [evalResult];
            } else if (typeof evalResult === 'number' && !isFinite(evalResult) ) {
              error = `Deterministic calculation resulted in a non-finite number: ${evalResult}.`;
              currentResults = [NaN]; // Push NaN to indicate error state for results
            } else if (typeof evalResult === 'string') { // evaluateDeterministic can return error string
              error = evalResult; 
              currentResults = [NaN]; // Push NaN
            }
        } else { 
            currentResults = runSimulation(processedData.expression, iterations);
        }
      }

      // Check for NaN results from simulation/evaluation
      if (!error && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length && currentResults.length > 0 && iterations > 0 && !isDeterministicCalculation) {
               // All results are NaN from a simulation
               error = `Calculation resulted in errors for all ${iterations} iterations. This might be due to invalid ranges (e.g., min > max) or issues within the expression itself for the sampled values. Check console for per-iteration details.`;
          } else if (nanCount > 0 && !isDeterministicCalculation) {
             // Some NaNs in simulation, they will be filtered for stats
             console.warn(`[useCalculator] ${nanCount} NaN results out of ${iterations} iterations were filtered out before statistical analysis.`);
          }
          // If deterministic and result is NaN, it was already set as an error or will be caught below
      }
      
      const validResultsForStats = currentResults.filter(r => !isNaN(r) && isFinite(r));

      if (!error && validResultsForStats.length === 0 && submittedExpression && (iterations > 0 || isDeterministicCalculation) && !processedData?.error) {
          // This can happen if simulation yields all NaNs or deterministic yields NaN without a specific error message yet
          error = `No valid numerical results obtained. Expression: "${submittedExpression}". Please check ranges and operators.`;
      }


    } catch (e: any) { // Catch errors from preprocessExpression or other synchronous setup
      error = `Calculation setup error: ${e.message || "Unknown error during preprocessing"}`;
      currentResults = []; // Ensure results are empty on critical setup error
      console.error("[useCalculator] Critical error during calculation setup:", e);
    }

    const finalValidResults = currentResults.filter(n => !isNaN(n) && isFinite(n));
    
    const calculatedMin = finalValidResults.length > 0 ? finalValidResults.reduce((a, b) => Math.min(a, b), Infinity) : NaN;
    const calculatedMax = finalValidResults.length > 0 ? finalValidResults.reduce((a, b) => Math.max(a, b), -Infinity) : NaN;
    const calculatedMean = getMean(finalValidResults);
    const calculatedStdDev = getStandardDeviation(finalValidResults);

    setData({
      results: finalValidResults.length > 0 ? finalValidResults : (processedData?.error || error) ? [NaN] : [], // Ensure results has at least one NaN if there was an error and no valid numbers
      min: calculatedMin,
      max: calculatedMax,
      mean: calculatedMean,
      stdDev: calculatedStdDev,
      p5: getPercentile(finalValidResults, 5),
      p10: getPercentile(finalValidResults, 10),
      p50: getPercentile(finalValidResults, 50), // Median
      p90: getPercentile(finalValidResults, 90),
      p95: getPercentile(finalValidResults, 95),
      histogram: getHistogram(finalValidResults, histogramBinCount, calculatedMean, calculatedStdDev), // Pass mean and stdDev
      error,
      isDeterministic: isDeterministicCalculation,
      expressionUsed: submittedExpression // Keep track of the expression that produced these results
    });

  // data.expressionUsed is included to re-evaluate if the input field is cleared after a calculation
  // (to reset the UI from showing old results for an empty input).
  }, [submittedExpression, iterations, histogramBinCount, isClient, data.expressionUsed]); 

  return data;
}

