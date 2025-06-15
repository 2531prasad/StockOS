
import { useState, useEffect } from 'react';
import { preprocessExpression, type ProcessedExpression } from "../utils/expressionParser";
import { runSimulation, evaluateDeterministic } from "../utils/monteCarlo";
import { getPercentile, getHistogram, getStandardDeviation, getMean, type HistogramDataEntry as StatsHistogramDataEntry } from "../utils/stats";

// This is the type coming from stats.ts
export type HistogramDataEntry = StatsHistogramDataEntry;

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
  histogram: HistogramDataEntry[];
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
    if (!isClient) {
      // Server-side rendering or initial client render before setIsClient(true) from the first useEffect.
      // Ensure we are using default data. Avoid unnecessary setData if already default.
      if (JSON.stringify(data) !== JSON.stringify(defaultInitialResults)) {
        setData(defaultInitialResults);
      }
      return;
    }

    // Client-side rendering (isClient is true)
    if (!submittedExpression) {
      // No expression submitted yet. Reset to default.
      // Avoid unnecessary setData if already default.
      if (JSON.stringify(data) !== JSON.stringify(defaultInitialResults)) {
        setData(defaultInitialResults);
      }
      return;
    }

    // Proceed with calculation: we are on the client and have an expression.
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
              currentResults = [NaN];
            } else if (typeof evalResult === 'string') {
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
             console.warn(`[useCalculator] ${nanCount} NaN results out of ${iterations} iterations were filtered out before statistical analysis.`);
          }
      }

      const validResultsForStats = currentResults.filter(r => !isNaN(r) && isFinite(r));

      if (!error && validResultsForStats.length === 0 && submittedExpression && (iterations > 0 || isDeterministicCalculation) && !processedData?.error) {
          error = `No valid numerical results obtained. Expression: "${submittedExpression}". Please check ranges and operators.`;
      }

    } catch (e: any) {
      error = `Calculation setup error: ${e.message || "Unknown error during preprocessing"}`;
      currentResults = [];
      console.error("[useCalculator] Critical error during calculation setup:", e);
    }

    const finalValidResults = currentResults.filter(n => !isNaN(n) && isFinite(n));

    const calculatedMin = finalValidResults.length > 0 ? finalValidResults.reduce((min, val) => Math.min(min, val), Infinity) : NaN;
    const calculatedMax = finalValidResults.length > 0 ? finalValidResults.reduce((max, val) => Math.max(max, val), -Infinity) : NaN;
    const calculatedMean = getMean(finalValidResults);
    const calculatedStdDev = getStandardDeviation(finalValidResults);
    const calculatedP50 = getPercentile(finalValidResults, 50);

    setData({
      results: finalValidResults.length > 0 ? finalValidResults : (processedData?.error || error) ? [NaN] : [],
      min: calculatedMin,
      max: calculatedMax,
      mean: calculatedMean,
      stdDev: calculatedStdDev,
      p5: getPercentile(finalValidResults, 5),
      p10: getPercentile(finalValidResults, 10),
      p50: calculatedP50,
      p90: getPercentile(finalValidResults, 90),
      p95: getPercentile(finalValidResults, 95),
      histogram: getHistogram(finalValidResults, histogramBinCount, calculatedMean, calculatedStdDev),
      error,
      isDeterministic: isDeterministicCalculation,
      expressionUsed: submittedExpression
    });

  }, [submittedExpression, iterations, histogramBinCount, isClient]); // Simplified dependency array

  return data;
}
