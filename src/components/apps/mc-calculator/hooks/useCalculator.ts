
import { useState, useEffect } from 'react';
import { substituteRangesWithPlaceholders, preprocessForMonteCarlo, type ProcessedExpression, type ExtractedRangeInfo } from "../utils/expressionParser";
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
  analyticalError: string | null; 
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

const MAX_ANALYTICAL_COMBINATIONS = 8; // 2^8 = 256 evaluations

export function useCalculator(submittedExpression: string, iterations: number = 10000, histogramBinCount: number = 23): CalculatorResults {
  const [data, setData] = useState<CalculatorResults>(defaultInitialResults);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      if (JSON.stringify(data) !== JSON.stringify(defaultInitialResults)) {
        setData(defaultInitialResults);
      }
      return;
    }
    
    if (!submittedExpression) {
        if (JSON.stringify(data) !== JSON.stringify(defaultInitialResults)) {
          setData(defaultInitialResults);
        }
        return;
    }

    let currentResults: number[] = [];
    let generalError: string | null = null;
    let isDeterministicCalculation = false;
    let processedMonteCarloData: ProcessedExpression | null = null;
    
    let currentAnalyticalMin: number = NaN;
    let currentAnalyticalMax: number = NaN;
    let currentAnalyticalError: string | null = null;

    try {
      // --- Analytical Min/Max Calculation ---
      const { commonSubstitutedExpr, exprWithPlaceholders, ranges, error: substitutionError } = substituteRangesWithPlaceholders(submittedExpression);
      
      if (substitutionError) {
        currentAnalyticalError = `Error parsing ranges for analytical calculation: ${substitutionError}`;
      }

      const numRanges = ranges.length;

      if (!currentAnalyticalError) { // Proceed if no initial parsing error
        if (numRanges === 0) { // Deterministic case for analytical
          const evalResult = evaluateDeterministic(commonSubstitutedExpr); // Use commonSubstitutedExpr
          if (typeof evalResult === 'number' && isFinite(evalResult)) {
            currentAnalyticalMin = evalResult;
            currentAnalyticalMax = evalResult;
          } else if (typeof evalResult === 'string') {
            currentAnalyticalError = `Analytical evaluation error: ${evalResult}`;
          } else {
            currentAnalyticalError = `Analytical evaluation resulted in non-finite value: ${evalResult}.`;
          }
        } else if (numRanges > 0 && numRanges <= MAX_ANALYTICAL_COMBINATIONS) {
          const analyticalResults: number[] = [];
          const numCombinations = 1 << numRanges; // 2^numRanges

          for (let i = 0; i < numCombinations; i++) {
            let tempExpr = exprWithPlaceholders;
            let combinationHasNaNRange = false;
            for (let j = 0; j < numRanges; j++) {
              if (isNaN(ranges[j].minVal) || isNaN(ranges[j].maxVal)) {
                combinationHasNaNRange = true;
                break; 
              }
              const valToSub = (i >> j) & 1 ? ranges[j].maxVal : ranges[j].minVal;
              tempExpr = tempExpr.replace(ranges[j].placeholder, String(valToSub));
            }

            if (combinationHasNaNRange) {
                 analyticalResults.push(NaN); // Propagate error from range parsing
                 console.warn(`[useCalculator] Skipping analytical combination due to NaN in range definition for: ${exprWithPlaceholders}`);
                 continue;
            }

            const evalResult = evaluateDeterministic(tempExpr);
            if (typeof evalResult === 'number') {
              analyticalResults.push(evalResult);
            } else {
              analyticalResults.push(NaN); // Error or non-finite from this specific combination
              console.warn(`[useCalculator] Analytical combination "${tempExpr}" resulted in error/NaN: ${evalResult}`);
            }
          }
          
          const validAnalyticalResults = analyticalResults.filter(r => !isNaN(r) && isFinite(r));
          if (validAnalyticalResults.length > 0) {
            currentAnalyticalMin = validAnalyticalResults.reduce((min, val) => Math.min(min, val), Infinity);
            currentAnalyticalMax = validAnalyticalResults.reduce((max, val) => Math.max(max, val), -Infinity);
          } else {
            currentAnalyticalError = (currentAnalyticalError ? currentAnalyticalError + ". " : "") + "All analytical combinations resulted in errors or non-finite values.";
          }

        } else { // numRanges > MAX_ANALYTICAL_COMBINATIONS (fallback to 2-scenario heuristic)
          currentAnalyticalError = `Note: True analytical range is approximated due to many (${numRanges}) range combinations. `;
          let minOnlyExpr = exprWithPlaceholders;
          let maxOnlyExpr = exprWithPlaceholders;
          let heuristicHasNaNRange = false;

          for (let j = 0; j < numRanges; j++) {
             if (isNaN(ranges[j].minVal) || isNaN(ranges[j].maxVal)) {
                heuristicHasNaNRange = true;
                break; 
              }
            minOnlyExpr = minOnlyExpr.replace(ranges[j].placeholder, String(ranges[j].minVal));
            maxOnlyExpr = maxOnlyExpr.replace(ranges[j].placeholder, String(ranges[j].maxVal));
          }

          if (heuristicHasNaNRange) {
            currentAnalyticalError += "Additionally, some range definitions were invalid.";
            // min/max will remain NaN
          } else {
            const evalMinHeuristic = evaluateDeterministic(minOnlyExpr);
            const evalMaxHeuristic = evaluateDeterministic(maxOnlyExpr);

            const validHeuristicResults: number[] = [];
            if (typeof evalMinHeuristic === 'number' && isFinite(evalMinHeuristic)) validHeuristicResults.push(evalMinHeuristic);
            if (typeof evalMaxHeuristic === 'number' && isFinite(evalMaxHeuristic)) validHeuristicResults.push(evalMaxHeuristic);
            
            if (validHeuristicResults.length > 0) {
                 currentAnalyticalMin = validHeuristicResults.reduce((min, val) => Math.min(min, val), Infinity);
                 currentAnalyticalMax = validHeuristicResults.reduce((max, val) => Math.max(max, val), -Infinity);
                  if ( (typeof evalMinHeuristic !== 'number' || !isFinite(evalMinHeuristic) ) || (typeof evalMaxHeuristic !== 'number' || !isFinite(evalMaxHeuristic) ) ) {
                     currentAnalyticalError += "Some heuristic evaluations failed. ";
                  }
            } else {
                 currentAnalyticalError += "Both heuristic evaluations (all-min, all-max) failed or yielded non-finite results.";
            }
          }
        }
      }


      // --- Monte Carlo Simulation Calculation ---
      processedMonteCarloData = preprocessForMonteCarlo(submittedExpression);

      if (processedMonteCarloData.error) {
        generalError = (generalError ? generalError + ". " : "") + processedMonteCarloData.error;
      }
      
      if (!generalError && processedMonteCarloData.expression) {
        isDeterministicCalculation = !processedMonteCarloData.isProbabilistic;

        if (isDeterministicCalculation) {
            // Use commonSubstitutedExpr for deterministic MC as well, since it's already processed for evaluation
            const evalResult = evaluateDeterministic(commonSubstitutedExpr); 
            if (typeof evalResult === 'number' && isFinite(evalResult)) {
              currentResults = [evalResult];
            } else if (typeof evalResult === 'number' && !isFinite(evalResult) ) {
              generalError = (generalError ? generalError + ". " : "") + `Deterministic calculation resulted in a non-finite number: ${evalResult}.`;
              currentResults = [NaN];
            } else if (typeof evalResult === 'string') {
              generalError = (generalError ? generalError + ". " : "") + evalResult;
              currentResults = [NaN];
            }
        } else {
            currentResults = runSimulation(processedMonteCarloData.expression, iterations);
        }
      } else if (!processedMonteCarloData.expression && !generalError) {
         generalError = "Failed to prepare expression for Monte Carlo simulation.";
      }


      if (!generalError && currentResults.some(isNaN)) {
          const nanCount = currentResults.filter(isNaN).length;
          if (nanCount === currentResults.length && currentResults.length > 0 && iterations > 0 && !isDeterministicCalculation) {
               generalError = (generalError ? generalError + ". " : "") + `Simulation resulted in errors for all ${iterations} iterations. Check ranges and expression validity.`;
          } else if (nanCount > 0 && !isDeterministicCalculation) {
             console.warn(`[useCalculator] ${nanCount} NaN results out of ${iterations} iterations were filtered out before statistical analysis.`);
          }
      }

      const validResultsForStats = currentResults.filter(r => !isNaN(r) && isFinite(r));

      if (!generalError && validResultsForStats.length === 0 && submittedExpression && (iterations > 0 || isDeterministicCalculation) && !processedMonteCarloData?.error) {
          generalError = (generalError ? generalError + ". " : "") + `No valid numerical results obtained from simulation. Expression: "${submittedExpression}".`;
      }

    } catch (e: any) {
      generalError = (generalError ? generalError + ". " : "") + `Calculation setup error: ${e.message || "Unknown error"}`;
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
      results: finalValidResults.length > 0 ? finalValidResults : (processedMonteCarloData?.error || generalError || substitutionError) ? [NaN] : [],
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

  }, [submittedExpression, iterations, histogramBinCount, isClient]);

  return data;
}
