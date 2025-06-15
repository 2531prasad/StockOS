
export interface PreprocessedExpression {
  expression: string; // Expression with placeholders like VAR0, VAR1
  ranges: { min: number; max: number }[]; // Array of ranges corresponding to placeholders
}

export function preprocessExpression(expr: string): PreprocessedExpression {
  // 1. Replace 'x' or 'X' with '*' for multiplication (case-insensitive)
  let processedExpr = expr.replace(/x|X/gi, '*');

  // 2. Remove all whitespace characters.
  processedExpr = processedExpr.replace(/\s+/g, '');

  const ranges: { min: number; max: number }[] = [];
  let varIndex = 0;

  // Regex to find number ranges like "100~120", "-10~20", "0.5~0.75"
  // It matches:
  // (-?\d+(?:\.\d+)?)  : Group 1 (minStr): An optional minus, one or more digits,
  //                                       optionally followed by a decimal part (a dot and more digits).
  // ~                   : A literal tilde character, acting as the separator for the range.
  // (-?\d+(?:\.\d+)?)  : Group 2 (maxStr): Same pattern as Group 1 for the maximum value of the range.
  // The 'g' flag (global) ensures that all occurrences of such ranges in the expression are found and replaced.
  const expressionWithPlaceholders = processedExpr.replace(
    /(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/g,
    (match, minStr, maxStr) => {
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);

      if (isNaN(min) || isNaN(max)) {
        console.warn(`Failed to parse range from match: "${match}". Min string: "${minStr}", Max string: "${maxStr}"`);
        return match; 
      }
      
      ranges.push({ min, max });
      const placeholder = `VAR${varIndex++}`;
      return placeholder;
    }
  );

  return {
    expression: expressionWithPlaceholders,
    ranges: ranges,
  };
}
