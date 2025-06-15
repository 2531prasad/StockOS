
import { create, all, type MathJsStatic } from "mathjs";
import type { PreprocessedExpression } from "./expressionParser"; // Import the interface

const math: MathJsStatic = create(all);

// Helper to sample a single range
function sampleRange(min: number, max: number): number {
  if (min > max) {
    // This case should ideally be caught earlier or handled,
    // but as a fallback, return NaN or throw error.
    // For now, to prevent Math.random issues with inverted ranges:
    return NaN;
  }
  return Math.random() * (max - min) + min;
}

export function runSimulation(
  processedData: PreprocessedExpression,
  iterations = 10000
): number[] {
  const results: number[] = [];
  if (!processedData.expression) {
    return Array(iterations).fill(NaN);
  }

  let compiled;
  try {
    compiled = math.compile(processedData.expression);
  } catch (error) {
    console.error("MonteCarlo Error: Failed to compile expression '", processedData.expression, "'. Error:", error);
    return Array(iterations).fill(NaN); // If compile fails, all results are NaN
  }

  for (let i = 0; i < iterations; i++) {
    const scope: { [key: string]: number } = {};
    processedData.ranges.forEach((range, index) => {
      scope[`VAR${index}`] = sampleRange(range.min, range.max);
    });

    let evaluatedValue;
    try {
      evaluatedValue = compiled.evaluate(scope);

      if (typeof evaluatedValue === 'object' && evaluatedValue !== null && typeof (evaluatedValue as any).toNumber === 'function') {
        const numVal = (evaluatedValue as any).toNumber();
        if (isFinite(numVal)) {
          results.push(numVal);
        } else {
          results.push(NaN); // Handle BigNumbers that convert to non-finite standard numbers
        }
      } else if (typeof evaluatedValue === 'number' && isFinite(evaluatedValue)) {
        results.push(evaluatedValue);
      } else {
        results.push(NaN); // Non-finite numbers or unexpected types from evaluation
      }
    } catch (error) {
      console.error("MonteCarlo Error: Failed to evaluate expression '", processedData.expression, "' with scope ", JSON.stringify(scope), ". Error:", error);
      results.push(NaN);
    }
  }
  return results;
}
