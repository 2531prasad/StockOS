
export interface PreprocessedExpression {
  expression: string; // Expression with placeholders like VAR0, VAR1
  ranges: { min: number; max: number }[]; // Array of ranges corresponding to placeholders
}

export function preprocessExpression(expr: string): PreprocessedExpression {
  console.log('[expressionParser] Raw input expression:', JSON.stringify(expr));

  let processedExpr = expr.replace(/x|X/gi, '*');
  processedExpr = processedExpr.replace(/\s+/g, ''); // Remove all whitespace
  console.log('[expressionParser] After whitespace and "x" replacement:', JSON.stringify(processedExpr));

  const ranges: { min: number; max: number }[] = [];
  let varIndex = 0;
  let expressionWithPlaceholders = processedExpr;

  // Regex must be global for iterative exec to advance.
  const rangeRegex = /(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/g; 
  let matchResult;

  // eslint-disable-next-line no-cond-assign
  while ((matchResult = rangeRegex.exec(expressionWithPlaceholders)) !== null) {
    const fullMatch = matchResult[0]; // The entire matched string, e.g., "600~700"
    const minStr = matchResult[1];    // The first captured group (min value string)
    const maxStr = matchResult[2];    // The second captured group (max value string)

    console.log(`[expressionParser] Iteration ${varIndex}: Found match "${fullMatch}" at index ${matchResult.index}. Current expression: "${expressionWithPlaceholders}"`);

    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);

    if (isNaN(min) || isNaN(max)) {
      console.warn(`[expressionParser] Failed to parse range from match: "${fullMatch}". Min string: "${minStr}", Max string: "${maxStr}". Replacing with error placeholder.`);
      const errorPlaceholder = `_INVALID_RANGE_${varIndex}_`;
      expressionWithPlaceholders = 
          expressionWithPlaceholders.substring(0, matchResult.index) + 
          errorPlaceholder + 
          expressionWithPlaceholders.substring(matchResult.index + fullMatch.length);
      rangeRegex.lastIndex = 0; // Reset regex for the modified string
      continue; 
    }
    
    ranges.push({ min, max });
    const placeholder = `VAR${varIndex++}`;
    
    expressionWithPlaceholders = 
        expressionWithPlaceholders.substring(0, matchResult.index) + 
        placeholder + 
        expressionWithPlaceholders.substring(matchResult.index + fullMatch.length);
    
    console.log(`[expressionParser] Iteration ${varIndex-1}: Replaced with "${placeholder}". New expression: "${expressionWithPlaceholders}"`);
    
    // Reset the regex's lastIndex because the string has been modified.
    // This ensures the next search starts from the beginning of the modified string.
    rangeRegex.lastIndex = 0;
  }
  
  console.log('[expressionParser] Final expressionWithPlaceholders:', JSON.stringify(expressionWithPlaceholders));
  console.log('[expressionParser] Collected ranges:', JSON.stringify(ranges));

  const malformedVarPattern = /VAR\d+VAR\d+/;
  if (malformedVarPattern.test(expressionWithPlaceholders)) {
    const errorMessage = `[expressionParser] CRITICAL PARSER ERROR: Malformed VARnVARm pattern detected in expression: "${expressionWithPlaceholders}". This indicates operators between ranges were lost.`;
    console.error(errorMessage);
  }

  return {
    expression: expressionWithPlaceholders,
    ranges: ranges,
  };
}
