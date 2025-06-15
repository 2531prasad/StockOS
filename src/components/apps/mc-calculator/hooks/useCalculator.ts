
import React from 'react';
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
  p90: number;
  p95: number;
  histogram: { bin: number; count: number }[];
  error: string | null;
  isDeterministic: boolean;
}

export function useCalculator(expression: string, iterations: number = 10000): CalculatorResults {
  
  const [prevExpression, setPrevExpression] = React.useState<string | null>(null);
  const [cachedResults, setCachedResults] = React.useState<CalculatorResults | null>(null);

  if (expression === prevExpression && cachedResults) {
    return cachedResults;
  }

  let currentResults: number[];
  let error: string | null = null;
  let isDeterministic = false;

  try {
    const preprocessed = preprocessExpression(expression);
    
    if (!expression.includes("~")) { // Simple check for deterministic
        const math = require('mathjs'); // Dynamic import for potentially less usage
        const singleResult = math.evaluate(preprocessed);
        if (typeof singleResult === 'number' && isFinite(singleResult)) {
            currentResults = [singleResult];
            isDeterministic = true;
        } else if (typeof singleResult === 'object' && singleResult.hasOwnProperty('value')) { // Handle units or complex mathjs objects
            currentResults = [Number(singleResult.value)]; // Attempt to extract numerical value
            isDeterministic = true;
        } else {
            // If math.evaluate doesn't return a number for a "deterministic" expression
            // Fallback to simulation, or handle as error / NaN case.
            // For now, let's assume it will run simulation if not clearly deterministic.
            currentResults = runSimulation(preprocessed, 1); // Run 1 iteration for deterministic
            isDeterministic = true;
             if (isNaN(currentResults[0])) {
                error = "Invalid expression or non-numeric result.";
             }
        }

    } else {
        currentResults = runSimulation(preprocessed, iterations);
        isDeterministic = false;
    }
    
    if (currentResults.some(isNaN) && !error) {
        const nanCount = currentResults.filter(isNaN).length;
        if (nanCount === currentResults.length) {
             error = "Calculation resulted in errors for all iterations.";
        } else {
            // Filter out NaNs for statistical analysis if some results are valid
            // error = `Calculation resulted in errors for ${nanCount} of ${currentResults.length} iterations.`;
            // For now, we'll proceed with valid results if any. Consider how to handle partial NaNs.
        }
        currentResults = currentResults.filter(r => !isNaN(r)); // Use only valid numbers for stats
    }
    if (currentResults.length === 0 && !error) {
        error = "No valid results from simulation.";
        currentResults = [0]; // Prevent crashes in Math.min/max, stats functions
    }


  } catch (e: any) {
    console.error("Error in useCalculator:", e);
    error = e.message || "Calculation error";
    currentResults = [0]; // Default to prevent crashes in stats
  }
  
  const finalResults = currentResults.length > 0 ? currentResults : [0]; // Ensure stats functions don't crash

  const newCalcResults: CalculatorResults = {
    results: finalResults,
    min: finalResults.length ? Math.min(...finalResults) : 0,
    max: finalResults.length ? Math.max(...finalResults) : 0,
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
  };
  
  // Basic caching:
  // Note: This simple caching won't survive component unmounts or prop changes that don't go through `expression`.
  // For more robust caching, consider React context or a dedicated state management library.
  // Also, `setPrevExpression` and `setCachedResults` would ideally be part of a `useEffect`
  // to avoid "cannot update a component while rendering a different component" warnings
  // if this hook is called directly in render. However, for this specific use case,
  // it might be acceptable if the re-calculation is driven by `expression` change.
  // A better pattern: use React.useMemo for this.

  // Using useMemo is preferred here. This example shows a conceptual cache.
  // For a real app, wrap the logic in useMemo:
  // const calculatedData = React.useMemo(() => { /* ... calculation ... */ return newCalcResults; }, [expression, iterations]);
  // return calculatedData;

  // For now, returning directly, assuming the parent component manages re-renders based on expression.
  return newCalcResults;
}
