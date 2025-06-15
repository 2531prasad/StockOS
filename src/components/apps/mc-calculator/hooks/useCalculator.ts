
import React, { useState, useEffect } from 'react';
import { preprocessExpression } from "../utils/expressionParser";
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
  p90: number; // Added p90 for completeness if desired, align with mc-calculator.tsx
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
    if (!isClient) { // Only run on client
      return;
    }
    
    if (!expression) { // If expression is empty, reset to default and don't calculate
      setData(defaultInitialResults);
      return;
    }

    let currentResults: number[] = [];
    let error: string | null = null;
    let isDeterministic = false;

    try {
      const preprocessed = preprocessExpression(expression);
      
      if (!expression.includes("~")) { // Deterministic calculation
          const math = require('mathjs'); // Local require to ensure it's only used when needed
          let singleResultValue: number | undefined;
          try {
            const evalResult = math.evaluate(preprocessed);
            if (typeof evalResult === 'number' && isFinite(evalResult)) {
                singleResultValue = evalResult;
            } else if (typeof evalResult === 'object' && evalResult !== null && evalResult.hasOwnProperty('value') && typeof evalResult.value === 'number' && isFinite(evalResult.value) ) {
                // Handle cases where mathjs might return an object with a 'value' property (e.g. units)
                singleResultValue = Number(evalResult.value);
            } else {
                error = "Invalid expression or non-numeric result.";
                currentResults = [NaN]; // Set to NaN array to indicate error state
            }
          } catch (e: any) {
            error = e.message || "Invalid deterministic expression.";
            currentResults = [NaN];
          }

          if (singleResultValue !== undefined) {
            currentResults = [singleResultValue];
            isDeterministic = true;
          } else if (!error) { // If no specific error but also no result, provide a generic one.
            error = "Expression could not be resolved to a number.";
            currentResults = [NaN];
          }
      } else { // Probabilistic calculation
          currentResults = runSimulation(preprocessed, iterations);
          isDeterministic = false;
      }
      
      // Check for NaN results from simulation or deterministic path
      if (!error && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length) { // All results are NaN
               error = "Calculation resulted in errors for all iterations.";
          }
          // Filter out NaNs for statistical calculations, but keep error if it exists
          currentResults = currentResults.filter(r => !isNaN(r)); 
      }

      if (!error && currentResults.length === 0) { // If filtering NaNs left no results
          error = "No valid results from simulation.";
          currentResults = [NaN]; // Ensure stats functions get at least one NaN
      }

    } catch (e: any) {
      error = e.message || "Calculation error";
      currentResults = [NaN]; // Ensure stats functions get at least one NaN
    }
    
    // Ensure there's always an array for stats, even if it's just [NaN] in case of errors
    const finalResults = currentResults.length > 0 ? currentResults : [NaN]; 

    setData({
      results: finalResults,
      min: finalResults.length && finalResults.every(n => !isNaN(n)) ? Math.min(...finalResults) : NaN,
      max: finalResults.length && finalResults.every(n => !isNaN(n)) ? Math.max(...finalResults) : NaN,
      mean: getMean(finalResults),
      stdDev: getStandardDeviation(finalResults),
      p5: getPercentile(finalResults, 5),
      p10: getPercentile(finalResults, 10),
      p50: getPercentile(finalResults, 50),
      p90: getPercentile(finalResults, 90),
      p95: getPercentile(finalResults, 95),
      histogram: getHistogram(finalResults), // getHistogram should also handle empty/NaN data gracefully
      error,
      isDeterministic
    });

  }, [expression, iterations, isClient]); // Rerun when expression, iterations, or isClient status changes

  return data;
}
