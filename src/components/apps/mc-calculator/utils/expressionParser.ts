
export function preprocessExpression(expr: string): string {
  // 1. Replace 'x' or 'X' with '*' for multiplication
  let processedExpr = expr.replace(/x|X/g, '*');

  // 2. Remove all whitespace
  processedExpr = processedExpr.replace(/\s+/g, '');

  // 3. Handle ranges (e.g., 100~120) by wrapping them in sample(range(min,max))
  // This regex needs to be applied to the already cleaned expression
  return processedExpr.replace(/(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/g, (_match, min, max) => {
    return `sample(range(${min},${max}))`;
  });
}
