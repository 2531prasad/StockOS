
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
  
  // Intentionally bypassing math.compile() for now to debug calculation issues.
  // Evaluating the raw string in each iteration.
  // let compiled;
  // try {
  //   compiled = math.compile(expr);
  // } catch (error) {
  //   console.error("Error compiling expression:", error); // Added console log for compilation error
  //   return Array(iterations).fill(NaN);
  // }

  for (let i = 0; i < iterations; i++) {
    const scope = {}; 
    
    let evaluatedValue;
    try {
      // Evaluate the raw expression string in each iteration instead of a compiled version
      evaluatedValue = math.evaluate(expr, scope);
      
      if (typeof evaluatedValue === 'object' && evaluatedValue !== null && typeof (evaluatedValue as any).toNumber === 'function') {
        results.push((evaluatedValue as any).toNumber());
      } else if (typeof evaluatedValue === 'number') {
        results.push(evaluatedValue);
      } else {
        results.push(NaN);
      }
    } catch (error) {
      // This catch handles errors during the evaluation of the expression,
      // e.g., division by zero if the sampled values lead to it, or other math errors.
      // console.error("Error evaluating expression in simulation iteration:", error); // Log available if needed
      results.push(NaN); 
    }
  }

  return results;
}

