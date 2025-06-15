
export interface PreprocessedExpression {
  expression: string; // Expression with placeholders like VAR0, VAR1
  ranges: { min: number; max: number }[]; // Array of ranges corresponding to placeholders
}

export function preprocessExpression(expr: string): PreprocessedExpression {
  let processedExpr = expr.replace(/x|X/g, '*');
  processedExpr = processedExpr.replace(/\s+/g, '');

  const ranges: { min: number; max: number }[] = [];
  let varIndex = 0;

  const expressionWithPlaceholders = processedExpr.replace(/(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/g, (_match, minStr, maxStr) => {
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    if (!isNaN(min) && !isNaN(max)) {
      ranges.push({ min, max });
      const placeholder = `VAR${varIndex++}`;
      return placeholder;
    }
    return _match; // Should not happen if regex matches correctly
  });

  return {
    expression: expressionWithPlaceholders,
    ranges: ranges,
  };
}
