
import { create, all, MathJsStatic } from "mathjs";
import type { PreprocessedExpression } from "./expressionParser"; // Import the interface

// No need for custom Range class or math.import for sample/range here anymore
// as sampling happens before evaluation.

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
    console.error("Error compiling expression:", error);
    return Array(iterations).fill(NaN);
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
        results.push((evaluatedValue as any).toNumber());
      } else if (typeof evaluatedValue === 'number' && isFinite(evaluatedValue)) {
        results.push(evaluatedValue);
      } else {
        results.push(NaN); // Non-finite numbers or unexpected types
      }
    } catch (error) {
      // console.error("Error evaluating expression in simulation iteration:", error);
      results.push(NaN); 
    }
  }
  return results;
}
