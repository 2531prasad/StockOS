
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
  // submittedExpression stores the expression that was actually submitted for calculation
  const [submittedExpression, setSubmittedExpression] = useState(""); 

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // This effect now solely relies on `expression` prop from MCCalculator to trigger re-evaluation
  // `MCCalculator` manages when `expression` (and thus `submittedExpression`) is updated based on user actions
  useEffect(() => {
    if (isClient) { // Only run on client
        setSubmittedExpression(expression);
    }
  }, [expression, isClient]);


  useEffect(() => {
    if (!isClient || !submittedExpression) {
      // If not on client or no expression submitted (e.g. initial empty input from MCCalculator), 
      // set to default state and don't proceed.
      setData(defaultInitialResults);
      return;
    }

    let currentResults: number[] = [];
    let error: string | null = null;
    let isDeterministicCalculation = false;
    let preprocessedData: PreprocessedExpression | null = null;

    try {
      preprocessedData = preprocessExpression(submittedExpression);

      if (preprocessedData.ranges.length === 0) { // Deterministic calculation
          const math = require('mathjs'); // Keep mathjs local to this block if only for deterministic
          let singleResultValue: number | undefined;
          try {
            // For deterministic, evaluate the raw expression (after 'x' and space cleanup but before VAR replacements)
            // Or, if preprocessedData.expression is already suitable (e.g. no VARs), use it.
            // Let's assume preprocessedData.expression is fine if ranges.length is 0
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
            error = `Deterministic evaluation error: ${e.message || "Invalid expression."}`;
          }

          if (singleResultValue !== undefined) {
            currentResults = [singleResultValue];
            isDeterministicCalculation = true;
          } else if (!error) { // If no result and no error yet, set a generic one
            error = "Expression could not be resolved to a number.";
          }
          // If an error occurred, currentResults might be empty or contain just NaN from a previous strategy
          if (error && currentResults.length === 0) currentResults = [NaN];

      } else { // Probabilistic calculation
          currentResults = runSimulation(preprocessedData, iterations);
          isDeterministicCalculation = false;
      }

      // Check for NaN results from simulation
      if (!error && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length && currentResults.length > 0 && iterations > 0 && preprocessedData && preprocessedData.ranges.length > 0) {
               // This error means all simulation iterations failed (e.g. produced NaN)
               error = `Calculation resulted in errors for all ${iterations} iterations. This might be due to invalid ranges (e.g., min > max) or issues within the expression itself for the sampled values. Check console for per-iteration details.`;
          } else if (nanCount > 0) {
            // Partial errors might indicate some problematic samples, but we proceed with valid ones.
            // console.warn(`${nanCount} iterations resulted in NaN.`);
          }
          currentResults = currentResults.filter(r => !isNaN(r)); // Filter out NaNs for stats
      }
      
      if (!error && currentResults.length === 0 && submittedExpression && iterations > 0 && preprocessedData && preprocessedData.ranges.length > 0) {
          // This condition implies a simulation was run, but yielded no valid (non-NaN) results.
          error = `No valid results from simulation after ${iterations} iterations. All iterations may have led to errors (e.g., NaN due to undefined symbols, invalid operations, or bad ranges). Check browser console for details.`;
      }


    } catch (e: any) { // Catch errors from preprocessExpression or other unexpected issues
      error = `Calculation setup error: ${e.message || "Unknown error"}`;
      currentResults = []; // Ensure results are empty on critical error
      console.error("[useCalculator] Critical error during calculation setup:", e);
    }

    // Ensure finalResults always has something if no other errors, to prevent crashes in stats
    const finalResults = currentResults.length > 0 ? currentResults : [NaN]; 
    const validFinalResults = finalResults.filter(n => !isNaN(n));


    setData({
      results: finalResults, // Store original results which might include NaNs for debugging if needed
      min: validFinalResults.length > 0 ? Math.min(...validFinalResults) : NaN,
      max: validFinalResults.length > 0 ? Math.max(...validFinalResults) : NaN,
      mean: getMean(validFinalResults),
      stdDev: getStandardDeviation(validFinalResults),
      p5: getPercentile(validFinalResults, 5),
      p10: getPercentile(validFinalResults, 10),
      p50: getPercentile(validFinalResults, 50), // Median
      p90: getPercentile(validFinalResults, 90),
      p95: getPercentile(validFinalResults, 95),
      histogram: getHistogram(validFinalResults), // Pass only valid numbers to histogram
      error,
      isDeterministic: isDeterministicCalculation
    });

  }, [submittedExpression, iterations, isClient]); // Rerun when submittedExpression or iterations change

  return data;
}
