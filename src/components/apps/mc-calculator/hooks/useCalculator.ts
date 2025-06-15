
import { useState, useEffect } from 'react';
import { preprocessForMonteCarlo, buildMinMaxExpressions, type ProcessedExpression } from "../utils/expressionParser";
import { runSimulation, evaluateDeterministic } from "../utils/monteCarlo";
import { getPercentile, getHistogram, getStandardDeviation, getMean, type HistogramDataEntry as StatsHistogramDataEntry } from "../utils/stats";

export type HistogramDataEntry = StatsHistogramDataEntry;

export interface CalculatorResults {
  results: number[];
  min: number; // Min from simulation
  max: number; // Max from simulation
  mean: number;
  stdDev: number;
  p5: number;
  p10: number;
  p50: number; // Median
  p90: number;
  p95: number;
  histogram: HistogramDataEntry[];
  error: string | null; // General calculation error
  isDeterministic: boolean;
  expressionUsed: string;
  analyticalMin: number;
  analyticalMax: number;
  analyticalError: string | null; // Specific error/note for analytical range calculation
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
  analyticalMin: NaN,
  analyticalMax: NaN,
  analyticalError: null,
};

export function useCalculator(submittedExpression: string, iterations: number = 10000, histogramBinCount: number = 23): CalculatorResults {
  const [data, setData] = useState<CalculatorResults>(defaultInitialResults);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      setData(prevData => JSON.stringify(prevData) !== JSON.stringify(defaultInitialResults) ? defaultInitialResults : prevData);
      return;
    }
    
    if (!submittedExpression) {
        setData(prevData => JSON.stringify(prevData) !== JSON.stringify(defaultInitialResults) ? defaultInitialResults : prevData);
        return;
    }


    let currentResults: number[] = [];
    let generalError: string | null = null;
    let isDeterministicCalculation = false;
    let processedMonteCarloData: ProcessedExpression | null = null;
    
    let currentAnalyticalMin: number = NaN;
    let currentAnalyticalMax: number = NaN;
    let currentAnalyticalError: string | null = null;

    let valForMinInputs: number = NaN;
    let valForMaxInputs: number = NaN;
    let minExprEvalError: string | null = null;
    let maxExprEvalError: string | null = null;

    try {
      // --- Analytical Min/Max Calculation ---
      const { minExpr, maxExpr } = buildMinMaxExpressions(submittedExpression);
      
      const evalMinResult = evaluateDeterministic(minExpr);
      if (typeof evalMinResult === 'string') {
        minExprEvalError = `Min-expression (${minExpr}) evaluation error: ${evalMinResult}`;
      } else if (isNaN(evalMinResult) || !isFinite(evalMinResult)) {
        minExprEvalError = `Min-expression (${minExpr}) resulted in non-finite value: ${evalMinResult}.`;
      } else {
        valForMinInputs = evalMinResult;
      }

      const evalMaxResult = evaluateDeterministic(maxExpr);
      if (typeof evalMaxResult === 'string') {
        maxExprEvalError = `Max-expression (${maxExpr}) evaluation error: ${evalMaxResult}`;
      } else if (isNaN(evalMaxResult) || !isFinite(evalMaxResult)) {
         maxExprEvalError = `Max-expression (${maxExpr}) resulted in non-finite value: ${evalMaxResult}.`;
      } else {
        valForMaxInputs = evalMaxResult;
      }

      if (minExprEvalError || maxExprEvalError) {
        currentAnalyticalError = [minExprEvalError, maxExprEvalError].filter(Boolean).join('. ');
      } else if (!isNaN(valForMinInputs) && !isNaN(valForMaxInputs)) { // Ensure both are valid numbers before comparison
        if (valForMinInputs > valForMaxInputs) {
          currentAnalyticalError = "Note: The expression's structure causes the 'all-min-inputs' case to yield a higher value than the 'all-max-inputs' case (e.g., due to subtraction or division by a range). The displayed analytical range reflects the true overall minimum and maximum possible outcomes.";
        }
        currentAnalyticalMin = Math.min(valForMinInputs, valForMaxInputs);
        currentAnalyticalMax = Math.max(valForMinInputs, valForMaxInputs);
      } else {
        currentAnalyticalError = (currentAnalyticalError || "") + " Could not determine analytical range due to non-finite results from min/max expressions.";
      }


      // --- Monte Carlo Simulation Calculation ---
      processedMonteCarloData = preprocessForMonteCarlo(submittedExpression);

      if (processedMonteCarloData.error) {
        generalError = processedMonteCarloData.error;
      } else {
        isDeterministicCalculation = !processedMonteCarloData.isProbabilistic;

        if (isDeterministicCalculation) {
            const evalResult = evaluateDeterministic(processedMonteCarloData.expression);
            if (typeof evalResult === 'number' && isFinite(evalResult)) {
              currentResults = [evalResult];
            } else if (typeof evalResult === 'number' && !isFinite(evalResult) ) {
              generalError = `Deterministic calculation resulted in a non-finite number: ${evalResult}.`;
              currentResults = [NaN];
            } else if (typeof evalResult === 'string') {
              generalError = evalResult; // Error message from evaluateDeterministic
              currentResults = [NaN];
            }
        } else {
            currentResults = runSimulation(processedMonteCarloData.expression, iterations);
        }
      }

      if (!generalError && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length && currentResults.length > 0 && iterations > 0 && !isDeterministicCalculation) {
               generalError = `Simulation resulted in errors for all ${iterations} iterations. This might be due to invalid ranges (e.g., min > max) or issues within the expression itself for the sampled values. Check console for per-iteration details.`;
          } else if (nanCount > 0 && !isDeterministicCalculation) {
             console.warn(`[useCalculator] ${nanCount} NaN results out of ${iterations} iterations were filtered out before statistical analysis.`);
          }
      }

      const validResultsForStats = currentResults.filter(r => !isNaN(r) && isFinite(r));

      if (!generalError && validResultsForStats.length === 0 && submittedExpression && (iterations > 0 || isDeterministicCalculation) && !processedMonteCarloData?.error) {
          generalError = `No valid numerical results obtained from simulation. Expression: "${submittedExpression}". Please check ranges and operators.`;
      }

    } catch (e: any) {
      generalError = `Calculation setup error: ${e.message || "Unknown error during preprocessing"}`;
      currentResults = []; 
      console.error("[useCalculator] Critical error during calculation setup:", e);
    }

    const finalValidResults = currentResults.filter(n => !isNaN(n) && isFinite(n));

    const calculatedSimMin = finalValidResults.length > 0 ? finalValidResults.reduce((min, val) => Math.min(min, val), Infinity) : NaN;
    const calculatedSimMax = finalValidResults.length > 0 ? finalValidResults.reduce((max, val) => Math.max(max, val), -Infinity) : NaN;
    const calculatedMean = getMean(finalValidResults);
    const calculatedStdDev = getStandardDeviation(finalValidResults);
    const calculatedP50 = getPercentile(finalValidResults, 50);

    setData({
      results: finalValidResults.length > 0 ? finalValidResults : (processedMonteCarloData?.error || generalError) ? [NaN] : [],
      min: calculatedSimMin,
      max: calculatedSimMax,
      mean: calculatedMean,
      stdDev: calculatedStdDev,
      p5: getPercentile(finalValidResults, 5),
      p10: getPercentile(finalValidResults, 10),
      p50: calculatedP50,
      p90: getPercentile(finalValidResults, 90),
      p95: getPercentile(finalValidResults, 95),
      histogram: getHistogram(finalValidResults, histogramBinCount, calculatedMean, calculatedStdDev),
      error: generalError,
      isDeterministic: isDeterministicCalculation,
      expressionUsed: submittedExpression,
      analyticalMin: currentAnalyticalMin,
      analyticalMax: currentAnalyticalMax,
      analyticalError: currentAnalyticalError,
    });

  }, [submittedExpression, iterations, histogramBinCount, isClient]); // Removed `data` from dependency array

  return data;
}
