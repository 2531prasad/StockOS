
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
    if (!isClient || !expression) {
      if (isClient && !expression) {
        setData(defaultInitialResults);
      }
      return;
    }

    let currentResults: number[] = [];
    let error: string | null = null;
    let isDeterministic = false;

    try {
      const preprocessed = preprocessExpression(expression);
      
      if (!expression.includes("~")) {
          const math = require('mathjs');
          let singleResultValue: number | undefined;
          try {
            const evalResult = math.evaluate(preprocessed);
            if (typeof evalResult === 'number' && isFinite(evalResult)) {
                singleResultValue = evalResult;
            } else if (typeof evalResult === 'object' && evalResult !== null && evalResult.hasOwnProperty('value') && typeof evalResult.value === 'number' && isFinite(evalResult.value) ) {
                singleResultValue = Number(evalResult.value);
            } else {
                error = "Invalid expression or non-numeric result.";
                currentResults = [NaN]; 
            }
          } catch (e: any) {
            error = e.message || "Invalid deterministic expression.";
            currentResults = [NaN];
          }

          if (singleResultValue !== undefined) {
            currentResults = [singleResultValue];
            isDeterministic = true;
          } else if (!error) { 
            error = "Expression could not be resolved to a number.";
            currentResults = [NaN];
          }
      } else {
          currentResults = runSimulation(preprocessed, iterations);
          isDeterministic = false;
      }
      
      if (!error && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length) {
               error = "Calculation resulted in errors for all iterations.";
          }
          currentResults = currentResults.filter(r => !isNaN(r)); 
      }

      if (!error && currentResults.length === 0) {
          error = "No valid results from simulation.";
          currentResults = [NaN]; 
      }

    } catch (e: any) {
      error = e.message || "Calculation error";
      currentResults = [NaN];
    }
    
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
      histogram: getHistogram(finalResults),
      error,
      isDeterministic
    });

  }, [expression, iterations, isClient]);

  return data;
}
