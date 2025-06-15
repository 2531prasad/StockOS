
import { create, all, MathJsStatic } from "mathjs";
import type { Range } from "./range"; // Use 'import type' for type-only imports

const math: MathJsStatic = create(all);

// It's good practice to type the arguments for imported functions if possible
math.import({
  range: (min: number, max: number): Range => new (math.Range as any)(min, max), // Use math.Range if Range is defined via math.typed
  sample: (r: Range): number => r.sample()
}, {
  override: true // Allow overriding existing functions if necessary, though 'range' is new
});

// Register Range with math.typed if you want mathjs to recognize it as a custom type
// This might be more involved depending on how deeply you want to integrate
// For now, the direct import approach with casting should work for 'range' function.
// A more robust way if Range class is external to mathjs's direct creation:
const RangeConstructor = require('./range').Range; // Assuming Range is a class constructor
math.typed('Range', {
  'number, number': (min, max) => new RangeConstructor(min, max)
});


export function runSimulation(expr: string, iterations = 10000): number[] {
  const results: number[] = [];
  let compiled;
  try {
    compiled = math.compile(expr);
  } catch (error) {
    console.error("Error compiling expression:", error);
    return [NaN]; // Return NaN or throw, to indicate failure
  }


  for (let i = 0; i < iterations; i++) {
    const scope = {}; // Create a new scope for each iteration if functions like `random()` are used in expr
    
    // If 'range' function in expression creates Range instances,
    // and these instances need to be sampled within the math.evaluate context,
    // ensure the compiled expression handles this.
    // The current `preprocessExpression` transforms `1~2` into `range(1,2)`.
    // The `math.import` then defines `range` to return a Range instance.
    // `math.evaluate` would return this Range instance.
    // The `evaluateRangeOrNumber` then samples it.

    let evaluatedValue;
    try {
      evaluatedValue = compiled.evaluate(scope);
    } catch (error) {
      console.error("Error evaluating expression in simulation:", error);
      results.push(NaN); // Push NaN for evaluation errors
      continue;
    }
    
    const sampled = evaluateRangeOrNumber(evaluatedValue);
    results.push(sampled);
  }

  return results;
}

function evaluateRangeOrNumber(val: any): number {
  // Check if val is an instance of your Range class
  // The path to Range class might differ based on how it's imported/defined in monteCarlo.ts
  // For simplicity, assuming Range class has a 'sample' method.
  if (val && typeof val.sample === 'function' && typeof val.min === 'number' && typeof val.max === 'number') {
     return val.sample();
  }
  if (typeof val === 'number') {
    return val;
  }
  // Handle cases where evaluation results in an object that's not a Range (e.g. from mathjs functions)
  // or if it's a mathjs BigNumber, convert it.
  if (val && typeof val.toNumber === 'function') {
    return val.toNumber();
  }
  // If it's not a Range instance and not a number, it might be an error or unexpected type
  // console.warn("Unexpected type in evaluateRangeOrNumber:", val);
  return Number(val); // Attempt conversion, might result in NaN
}
