
import { create, all, MathJsStatic } from "mathjs";
// Import the actual Range class, not just the type, because we need to instantiate it.
import { Range } from "./range";

const math: MathJsStatic = create(all);

math.import({
  // The 'range' function creates an instance of our custom Range class.
  range: (min: number, max: number): Range => new Range(min, max),
  // The 'sample' function takes a Range instance and returns a sampled number.
  // It's also made robust to handle direct numbers if an expression like sample(5) was manually written,
  // though current preprocessing focuses on sample(range(min,max)).
  sample: (r: Range | number): number => {
    if (r instanceof Range) {
      return r.sample();
    }
    if (typeof r === 'number') { // If sample() is called on a plain number
      return r;
    }
    // This path should ideally not be hit with the current preprocessing logic.
    throw new Error('Invalid argument for sample function: Expected Range object or number.');
  }
}, {
  override: true // Allows overriding if 'range' or 'sample' were predefined by mathjs (unlikely for these custom names)
});

export function runSimulation(expr: string, iterations = 10000): number[] {
  const results: number[] = [];
  let compiled;

  try {
    // Example expr after preprocessing: "sample(range(1400,1700)) * sample(range(0.55,0.65)) - ..."
    compiled = math.compile(expr);
  } catch (error) {
    // If compilation fails, return an array of NaNs.
    // The calling function (useCalculator) will handle the display of this error.
    return Array(iterations).fill(NaN);
  }

  for (let i = 0; i < iterations; i++) {
    const scope = {}; // A new scope for each iteration ensures that `sample(range(A,B))` is re-evaluated.
    
    let evaluatedValue;
    try {
      // compiled.evaluate(scope) should now return a single number for the whole expression per iteration,
      // as all Range objects are sampled into numbers during the evaluation process.
      evaluatedValue = compiled.evaluate(scope);
      
      // Math.js functions can return various types (e.g., BigNumber for precision).
      // We need to ensure the result pushed to our array is a standard JavaScript number.
      if (typeof evaluatedValue === 'object' && evaluatedValue !== null && typeof (evaluatedValue as any).toNumber === 'function') {
        results.push((evaluatedValue as any).toNumber());
      } else if (typeof evaluatedValue === 'number') {
        results.push(evaluatedValue);
      } else {
        // This case implies the expression didn't resolve to a number as expected.
        results.push(NaN);
      }
    } catch (error) {
      // This catch handles errors during the evaluation of the expression,
      // e.g., division by zero if the sampled values lead to it, or other math errors.
      results.push(NaN); // Push NaN for this iteration's result
      // Continue to the next iteration, the hook will report cumulative errors.
    }
  }

  return results;
}
