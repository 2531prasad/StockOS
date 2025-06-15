
import { create, all, type MathJsStatic } from "mathjs";

const math: MathJsStatic = create(all);

// Custom 'range' function for math.js
function createRange(min: number, max: number): { min: number; max: number; isRangeObject: true } | number {
  if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) {
    console.warn(`[monteCarlo] Invalid input to range function: min=${min}, max=${max}. Returning NaN.`);
    return NaN; // Return NaN if inputs are bad, sampleFromRange will propagate it
  }
  return { min, max, isRangeObject: true };
}

// Custom 'sample' function for math.js
function sampleFromRange(value: any): number {
  if (typeof value === 'object' && value !== null && value.isRangeObject === true) {
    const { min, max } = value;
    if (isNaN(min) || isNaN(max)) return NaN; // Propagate NaN from createRange
    if (min > max) {
      console.warn(`[monteCarlo] Invalid range in sample: min (${min}) > max (${max}). Sampling will produce NaN.`);
      return NaN;
    }
    if (min === max) {
      return min;
    }
    return Math.random() * (max - min) + min;
  } else if (typeof value === 'number') {
    // If sample() is called with a number, just return it.
    // This allows expressions like sample(5) to just be 5.
    return value;
  }
  console.warn(`[monteCarlo] Invalid input to sample function. Expected a range object or number, got:`, value, ". Returning NaN.");
  return NaN;
}

// Define the custom functions for math.js.
math.import({
  range: createRange,
  sample: sampleFromRange
}, { override: true });


export function runSimulation(
  expression: string,
  iterations = 10000
): number[] {
  const results: number[] = [];
  if (!expression) {
    console.warn("[monteCarlo] runSimulation called with empty expression.");
    return Array(iterations).fill(NaN);
  }

  let compiled: { evaluate: (scope?: object) => any; } | undefined;
  try {
    compiled = math.compile(expression);
  } catch (error: any) {
    console.error(
      `[monteCarlo] CRITICAL: Failed to compile expression '${expression}'. Error:`,
      error.message || error
    );
    return Array(iterations).fill(NaN);
  }

  for (let i = 0; i < iterations; i++) {
    let evaluatedValue;
    try {
      evaluatedValue = compiled.evaluate(); // Scope is no longer needed for VARn

      if (typeof evaluatedValue === 'object' && evaluatedValue !== null && typeof (evaluatedValue as any).toNumber === 'function') {
        const numVal = (evaluatedValue as any).toNumber();
        if (isFinite(numVal)) {
          results.push(numVal);
        } else {
           console.warn(`[monteCarlo] Iteration ${i + 1}: Evaluated value (from object) is not finite: ${numVal}. Expression: ${expression}`);
          results.push(NaN);
        }
      } else if (typeof evaluatedValue === 'number' && isFinite(evaluatedValue)) {
        results.push(evaluatedValue);
      } else {
        console.warn(`[monteCarlo] Iteration ${i + 1}: Evaluated value is not a finite number or recognized type: ${evaluatedValue}. Type: ${typeof evaluatedValue}. Expression: ${expression}`);
        results.push(NaN);
      }
    } catch (error: any) {
      console.error(
        `[monteCarlo] Iteration ${i + 1}/${iterations}: Failed to evaluate expression '${expression}'. Error:`, error.message || error
      );
      results.push(NaN);
    }
  }
  return results;
}

export function evaluateDeterministic(expression: string): number | string {
  if (!expression) return NaN;
  try {
    // The custom 'sample' and 'range' functions are available in math.js instance.
    // If user types sample(range(5,5)) in a deterministic context, it should still work.
    const result = math.evaluate(expression);

    if (typeof result === 'number' && isFinite(result)) {
      return result;
    } else if (typeof result === 'object' && result !== null && typeof (result as any).toNumber === 'function') {
        const numVal = (result as any).toNumber();
        if (isFinite(numVal)) return numVal;
        return `Error: Deterministic evaluation led to non-finite number: ${numVal}`;
    } else if (typeof result === 'object' && result !== null && result.isRangeObject === true) {
        // If the expression simplifies to just a range object, it's an error for deterministic.
        return `Error: Expression resolved to a range, not a number. Use '~' for ranges.`;
    }
    return `Error: Invalid result type: ${typeof result} for expression: ${expression}`;
  } catch (e: any) {
    return `Error in deterministic evaluation: ${e.message || "Invalid expression"}`;
  }
}
