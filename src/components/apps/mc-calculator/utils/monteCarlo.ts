
import { create, all, type MathJsStatic } from "mathjs";
import type { PreprocessedExpression } from "./expressionParser"; // Import the interface

const math: MathJsStatic = create(all);

// Helper to sample a single range
function sampleRange(min: number, max: number): number {
  if (min > max) {
    // console.warn(`[monteCarlo] Invalid range encountered: min (${min}) > max (${max}). Sampling will produce NaN.`);
    return NaN; // Return NaN if min > max, as sampling is ill-defined.
  }
  if (min === max) {
    return min; // If min and max are equal, return that value directly.
  }
  return Math.random() * (max - min) + min;
}

export function runSimulation(
  processedData: PreprocessedExpression,
  iterations = 10000
): number[] {
  const results: number[] = [];
  if (!processedData.expression) {
    console.warn("[monteCarlo] runSimulation called with empty processedData.expression.");
    return Array(iterations).fill(NaN);
  }

  let compiled;
  try {
    compiled = math.compile(processedData.expression);
  } catch (error) {
    console.error(
      "[monteCarlo] CRITICAL: Failed to compile expression '",
      processedData.expression,
      "'. Error:",
      error
    );
    // If compilation fails, all results will be NaN, handled by the caller or stats functions.
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
        // Handle mathjs specific types like BigNumber, Unit, etc.
        const numVal = (evaluatedValue as any).toNumber(); // Attempt to convert to a standard number
        if (isFinite(numVal)) {
          results.push(numVal);
        } else {
          // console.warn(`[monteCarlo] Iteration ${i}: Evaluated value (from object) is not finite: ${numVal}. Scope: ${JSON.stringify(scope)} Expression: ${processedData.expression}`);
          results.push(NaN); 
        }
      } else if (typeof evaluatedValue === 'number' && isFinite(evaluatedValue)) {
        results.push(evaluatedValue);
      } else {
        // console.warn(`[monteCarlo] Iteration ${i}: Evaluated value is not a finite number: ${evaluatedValue}. Type: ${typeof evaluatedValue}. Scope: ${JSON.stringify(scope)} Expression: ${processedData.expression}`);
        results.push(NaN); // Non-finite numbers or unexpected types from evaluation
      }
    } catch (error) {
      // Log detailed error for this specific iteration
      console.error(
        `[monteCarlo] Iteration ${i + 1}/${iterations}: Failed to evaluate expression '${processedData.expression}' with scope ${JSON.stringify(scope)}. Error:`, error
      );
      results.push(NaN); // Push NaN for this iteration's failure
    }
  }
  return results;
}
