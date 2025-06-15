
export function preprocessExpression(expr: string): string {
  // Updated regex to handle negative numbers in ranges more robustly
  // Wraps the range in sample() so mathjs evaluates it to a number during expression evaluation
  return expr.replace(/(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/g, (_match, min, max) => {
    return `sample(range(${min},${max}))`;
  });
}
