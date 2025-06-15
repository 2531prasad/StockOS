
export interface PreprocessedExpression {
  expression: string; // Expression with placeholders like VAR0, VAR1
  ranges: { min: number; max: number }[]; // Array of ranges corresponding to placeholders
}

export function preprocessExpression(expr: string): PreprocessedExpression {
  // Log the raw input expression for debugging
  console.log('[expressionParser] Raw input expression:', JSON.stringify(expr));

  // 1. Replace 'x' or 'X' with '*' for multiplication (case-insensitive)
  let processedExpr = expr.replace(/x|X/gi, '*');

  // 2. Remove all whitespace characters.
  processedExpr = processedExpr.replace(/\s+/g, '');
  console.log('[expressionParser] After whitespace and "x" replacement:', JSON.stringify(processedExpr));


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
        console.warn(`[expressionParser] Failed to parse range from match: "${match}". Min string: "${minStr}", Max string: "${maxStr}". Returning original match.`);
        return match; // Return original match if parsing fails, which could cause mathjs errors later
      }
      
      ranges.push({ min, max });
      const placeholder = `VAR${varIndex++}`;
      // console.log(`[expressionParser] Replacing "${match}" with "${placeholder}"`);
      return placeholder;
    }
  );
  
  console.log('[expressionParser] Final expressionWithPlaceholders:', JSON.stringify(expressionWithPlaceholders));
  console.log('[expressionParser] Collected ranges:', JSON.stringify(ranges));

  // Diagnostic check for merged VAR tokens
  const malformedVarPattern = /VAR\d+VAR\d+/;
  if (malformedVarPattern.test(expressionWithPlaceholders)) {
    const errorMessage = `[expressionParser] CRITICAL PARSER ERROR: Malformed VARnVARm pattern detected in expression: "${expressionWithPlaceholders}". This indicates operators between ranges were lost.`;
    console.error(errorMessage);
    // throw new Error(errorMessage); // Optionally throw to halt further processing immediately
  }

  return {
    expression: expressionWithPlaceholders,
    ranges: ranges,
  };
}
