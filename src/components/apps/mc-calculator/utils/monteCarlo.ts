
import { create, all, type MathJsStatic } from "mathjs";
import type { PreprocessedExpression } from "./expressionParser"; 

const math: MathJsStatic = create(all);

// Helper to sample a single range
function sampleRange(min: number, max: number): number {
  if (min > max) {
    console.warn(`[monteCarlo] Invalid range encountered: min (${min}) > max (${max}). Sampling will produce NaN.`);
    return NaN; 
  }
  if (min === max) {
    return min; 
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
        const numVal = (evaluatedValue as any).toNumber(); 
        if (isFinite(numVal)) {
          results.push(numVal);
        } else {
           console.warn(`[monteCarlo] Iteration ${i+1}: Evaluated value (from object) is not finite: ${numVal}. Scope: ${JSON.stringify(scope)} Expression: ${processedData.expression}`);
          results.push(NaN); 
        }
      } else if (typeof evaluatedValue === 'number' && isFinite(evaluatedValue)) {
        results.push(evaluatedValue);
      } else {
        console.warn(`[monteCarlo] Iteration ${i+1}: Evaluated value is not a finite number: ${evaluatedValue}. Type: ${typeof evaluatedValue}. Scope: ${JSON.stringify(scope)} Expression: ${processedData.expression}`);
        results.push(NaN); 
      }
    } catch (error) {
      console.error(
        `[monteCarlo] Iteration ${i + 1}/${iterations}: Failed to evaluate expression '${processedData.expression}' with scope ${JSON.stringify(scope)}. Error:`, error
      );
      results.push(NaN); 
    }
  }
  return results;
}
