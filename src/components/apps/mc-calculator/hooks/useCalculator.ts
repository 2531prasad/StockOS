
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


export function useCalculator(submittedExpression: string, iterations: number = 10000): CalculatorResults {
  const [data, setData] = useState<CalculatorResults>(defaultInitialResults);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // When component mounts, if there's a submittedExpression, calculate immediately
    // This handles the case where an expression is pre-filled
    if (submittedExpression) {
        // This effect will be triggered by submittedExpression change anyway
    } else {
        setData(defaultInitialResults); // Explicitly reset if no expression on mount
    }
  }, []); // Empty dependency array for client-side mount detection


  useEffect(() => {
    if (!isClient) { // Only run on client
      return;
    }
    if (!submittedExpression) {
      setData(prev => ({...defaultInitialResults, expressionUsed: prev.expressionUsed})); // Preserve previous expression if clearing
      return;
    }

    let currentResults: number[] = [];
    let error: string | null = null;
    let isDeterministicCalculation = false;
    let processedData: ProcessedExpression | null = null;
    let finalExpressionForMathJS = "";

    try {
      processedData = preprocessExpression(submittedExpression);
      finalExpressionForMathJS = processedData.expression;
      isDeterministicCalculation = !processedData.isProbabilistic;


      if (isDeterministicCalculation) {
          const evalResult = evaluateDeterministic(finalExpressionForMathJS);
          if (typeof evalResult === 'number') {
            currentResults = [evalResult];
          } else { // evalResult is an error string
            error = evalResult; // Error string from evaluateDeterministic
            currentResults = [NaN]; // Ensure results array has a NaN to reflect error
          }
      } else { // Probabilistic calculation
          currentResults = runSimulation(finalExpressionForMathJS, iterations);
      }

      // Check for NaN results from simulation or deterministic eval that produced error
      if (!error && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length && currentResults.length > 0 && iterations > 0 && !isDeterministicCalculation) {
               error = `Calculation resulted in errors for all ${iterations} iterations. This might be due to invalid ranges (e.g., min > max) or issues within the expression itself for the sampled values. Check console for per-iteration details.`;
          } else if (nanCount > 0 && !isDeterministicCalculation) {
            // Partial errors might indicate some problematic samples, but we proceed with valid ones.
          }
          // For deterministic, error is already set if evalResult was string.
          // currentResults might contain NaNs already from failed deterministic or probabilistic.
      }
      
      const validResultsForStats = currentResults.filter(r => !isNaN(r));

      if (!error && validResultsForStats.length === 0 && submittedExpression && iterations > 0 && !isDeterministicCalculation) {
          // This condition implies a simulation was run, but yielded no valid (non-NaN) results, and no specific error was set yet.
          error = `No valid results from simulation after ${iterations} iterations. All iterations may have led to errors. Check browser console for details.`;
      }


    } catch (e: any) { // Catch errors from preprocessExpression or other unexpected issues
      error = `Calculation setup error: ${e.message || "Unknown error during preprocessing"}`;
      currentResults = []; // Ensure results are empty on critical error
      console.error("[useCalculator] Critical error during calculation setup:", e);
    }

    const finalValidResults = currentResults.filter(n => !isNaN(n));


    setData({
      results: currentResults.length > 0 ? currentResults : [NaN], 
      min: finalValidResults.length > 0 ? Math.min(...finalValidResults) : NaN,
      max: finalValidResults.length > 0 ? Math.max(...finalValidResults) : NaN,
      mean: getMean(finalValidResults),
      stdDev: getStandardDeviation(finalValidResults),
      p5: getPercentile(finalValidResults, 5),
      p10: getPercentile(finalValidResults, 10),
      p50: getPercentile(finalValidResults, 50), 
      p90: getPercentile(finalValidResults, 90),
      p95: getPercentile(finalValidResults, 95),
      histogram: getHistogram(finalValidResults), 
      error,
      isDeterministic: isDeterministicCalculation,
      expressionUsed: submittedExpression 
    });

  }, [submittedExpression, iterations, isClient]); 

  return data;
}

