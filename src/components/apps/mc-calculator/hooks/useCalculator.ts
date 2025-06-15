
import { useState, useEffect } from 'react';
import { preprocessExpression, type ProcessedExpression } from "../utils/expressionParser";
import { runSimulation, evaluateDeterministic } from "../utils/monteCarlo";
import { getPercentile, getHistogram, getStandardDeviation, getMean } from "../utils/stats";

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
  histogram: { bin: number; count: number }[];
  error: string | null;
  isDeterministic: boolean;
  expressionUsed: string; // Store the expression that was actually calculated
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
    // Removed initial calculation on load
    // if (!submittedExpression) {
    //     setData(defaultInitialResults); 
    // }
  }, []);


  useEffect(() => {
    if (!isClient || !submittedExpression) { 
      // If not client-side or no expression submitted, do nothing or reset to default (excluding expressionUsed)
      if (!submittedExpression && data.expressionUsed) { // only reset if there's no expression and we had results before
         setData(prev => ({...defaultInitialResults, expressionUsed: prev.expressionUsed}));
      } else if (!submittedExpression) {
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
            if (typeof evalResult === 'number') {
              currentResults = [evalResult];
            } else { 
              error = evalResult; 
              currentResults = [NaN]; 
            }
        } else { 
            currentResults = runSimulation(processedData.expression, iterations);
        }
      }


      if (!error && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length && currentResults.length > 0 && iterations > 0 && !isDeterministicCalculation) {
               error = `Calculation resulted in errors for all ${iterations} iterations. This might be due to invalid ranges (e.g., min > max) or issues within the expression itself for the sampled values. Check console for per-iteration details.`;
          } else if (nanCount > 0 && !isDeterministicCalculation) {
            // Partial errors occurred, this is handled by filtering NaNs later
          }
      }
      
      const validResultsForStats = currentResults.filter(r => !isNaN(r));

      if (!error && validResultsForStats.length === 0 && submittedExpression && iterations > 0 && !isDeterministicCalculation && !processedData?.error) {
          error = `No valid results from simulation after ${iterations} iterations. All iterations may have led to errors. Check browser console for details.`;
      }


    } catch (e: any) { 
      error = `Calculation setup error: ${e.message || "Unknown error during preprocessing"}`;
      currentResults = []; 
      console.error("[useCalculator] Critical error during calculation setup:", e);
    }

    const finalValidResults = currentResults.filter(n => !isNaN(n));


    setData({
      results: finalValidResults.length > 0 ? finalValidResults : (processedData?.error || error) ? [NaN] : [], 
      min: finalValidResults.length > 0 ? finalValidResults.reduce((a, b) => Math.min(a, b), Infinity) : NaN,
      max: finalValidResults.length > 0 ? finalValidResults.reduce((a, b) => Math.max(a, b), -Infinity) : NaN,
      mean: getMean(finalValidResults),
      stdDev: getStandardDeviation(finalValidResults),
      p5: getPercentile(finalValidResults, 5),
      p10: getPercentile(finalValidResults, 10),
      p50: getPercentile(finalValidResults, 50), 
      p90: getPercentile(finalValidResults, 90),
      p95: getPercentile(finalValidResults, 95),
      histogram: getHistogram(finalValidResults, histogramBinCount), 
      error,
      isDeterministic: isDeterministicCalculation,
      expressionUsed: submittedExpression 
    });

  }, [submittedExpression, iterations, histogramBinCount, isClient, data.expressionUsed]); // Added data.expressionUsed

  return data;
}

