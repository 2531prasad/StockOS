
import React, { useState, useEffect } from 'react';
import { preprocessExpression, type PreprocessedExpression } from "../utils/expressionParser";
import { runSimulation } from "../utils/monteCarlo";
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
};


export function useCalculator(expression: string, iterations: number = 10000): CalculatorResults {
  const [data, setData] = useState<CalculatorResults>(defaultInitialResults);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) { 
      return; 
    }
    
    if (!expression) { 
      setData(defaultInitialResults);
      return;
    }

    let currentResults: number[] = [];
    let error: string | null = null;
    let isDeterministic = false;

    try {
      const preprocessedData = preprocessExpression(expression);
      
      if (preprocessedData.ranges.length === 0) { // Deterministic calculation if no ranges found
          const math = require('mathjs'); // Local require for mathjs
          let singleResultValue: number | undefined;
          try {
            // For deterministic, preprocessedData.expression is the original cleaned expression
            const evalResult = math.evaluate(preprocessedData.expression); 
            if (typeof evalResult === 'number' && isFinite(evalResult)) {
                singleResultValue = evalResult;
            } else if (typeof evalResult === 'object' && evalResult !== null && typeof (evalResult as any).toNumber === 'function') {
                const numVal = (evalResult as any).toNumber();
                if (isFinite(numVal)) singleResultValue = numVal;
                else error = "Deterministic expression resulted in a non-finite number.";
            } else {
                error = "Invalid expression or non-numeric result for deterministic calculation.";
            }
          } catch (e: any) {
            error = e.message || "Invalid deterministic expression.";
          }

          if (singleResultValue !== undefined) {
            currentResults = [singleResultValue];
            isDeterministic = true;
          } else if (!error) { 
            error = "Expression could not be resolved to a number.";
          }
          if (error) currentResults = [NaN]; // Ensure error state has NaN array

      } else { // Probabilistic calculation using new runSimulation
          currentResults = runSimulation(preprocessedData, iterations);
          isDeterministic = false;
      }
      
      if (!error && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length && currentResults.length > 0) { 
               error = "Calculation resulted in errors for all iterations.";
          } else if (nanCount > 0) {
            // Partial errors, might want to inform user or just proceed with valid results
          }
          currentResults = currentResults.filter(r => !isNaN(r)); 
      }

      if (!error && currentResults.length === 0) {
          error = "No valid results from simulation or calculation.";
          // currentResults remains empty, stats functions should handle this
      }

    } catch (e: any) {
      error = e.message || "Calculation error";
      currentResults = []; // On critical error, reset results
    }
    
    const finalResults = currentResults.length > 0 ? currentResults : [NaN]; // Ensure stats functions get at least one NaN if empty

    setData({
      results: finalResults,
      min: finalResults.length && finalResults.every(n => !isNaN(n)) && finalResults.length > 0 ? Math.min(...finalResults) : NaN,
      max: finalResults.length && finalResults.every(n => !isNaN(n)) && finalResults.length > 0 ? Math.max(...finalResults) : NaN,
      mean: getMean(finalResults),
      stdDev: getStandardDeviation(finalResults),
      p5: getPercentile(finalResults, 5),
      p10: getPercentile(finalResults, 10),
      p50: getPercentile(finalResults, 50),
      p90: getPercentile(finalResults, 90),
      p95: getPercentile(finalResults, 95),
      histogram: getHistogram(finalResults), 
      error,
      isDeterministic
    });

  }, [expression, iterations, isClient]);

  return data;
}
