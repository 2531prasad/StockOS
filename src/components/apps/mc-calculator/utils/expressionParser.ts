
export interface PreprocessedExpression {
  expression: string; // Expression with placeholders like VAR0, VAR1
  ranges: { min: number; max: number }[]; // Array of ranges corresponding to placeholders
}

export function preprocessExpression(expr: string): PreprocessedExpression {
  // 1. Replace 'x' or 'X' with '*' for multiplication (case-insensitive)
  let processedExpr = expr.replace(/x|X/gi, '*');

  // 2. Remove all whitespace characters. This is crucial for consistent parsing later.
  // E.g., "1 + 1" becomes "1+1". "100 ~ 200" becomes "100~200".
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
      // This callback function is executed for each match found by the regex.
      // 'match' is the entire matched string (e.g., "100~120").
      // 'minStr' is the content of the first capturing group (e.g., "100").
      // 'maxStr' is the content of the second capturing group (e.g., "120").
      
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);

      // Basic validation for parsed numbers.
      if (isNaN(min) || isNaN(max)) {
        // If parsing min/max fails (e.g., if the input was "abc~def" due to bad input or regex issue),
        // return the original matched string. This prevents further corruption of the expression.
        // The simulation might then fail if 'match' is not a valid number/operator.
        console.warn(`Failed to parse range from match: "${match}". Min string: "${minStr}", Max string: "${maxStr}"`);
        return match; 
      }
      
      ranges.push({ min, max }); // Store the numerical range.
      const placeholder = `VAR${varIndex++}`; // Create a unique placeholder like VAR0, VAR1, etc.
      return placeholder; // Replace the "min~max" string with the placeholder.
    }
  );

  // After all replacements, for an input like "1400~1700*0.55~0.65-600~700-100~200-30-20",
  // expressionWithPlaceholders should be "VAR0*VAR1-VAR2-VAR3-30-20".
  // The operators (*, -) and numbers (30, 20) that were not part of a range match
  // are preserved in their original positions relative to the placeholders.
  return {
    expression: expressionWithPlaceholders,
    ranges: ranges,
  };
}
