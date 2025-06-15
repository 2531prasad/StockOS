
export function preprocessExpression(expr: string): string {
  // Updated regex to handle negative numbers in ranges more robustly
  return expr.replace(/(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/g, (_match, min, max) => {
    return `range(${min},${max})`;
  });
}
