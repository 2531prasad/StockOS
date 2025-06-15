
export interface PreprocessedExpression {
  expression: string; // Expression with placeholders like VAR0, VAR1
  ranges: { min: number; max: number }[]; // Array of ranges corresponding to placeholders
}

export function preprocessExpression(expr: string): PreprocessedExpression {
  console.log('[expressionParser] Raw input expression:', JSON.stringify(expr));

  let processedExpr = expr.replace(/x|X/gi, '*');
  processedExpr = processedExpr.replace(/\s+/g, '');
  console.log('[expressionParser] After whitespace and "x" replacement:', JSON.stringify(processedExpr));

  const ranges: { min: number; max: number }[] = [];
  let varIndex = 0;
  let expressionWithPlaceholders = processedExpr;

  // Iteratively find and replace ranges
  // The regex looks for number~number patterns.
  // (-?\d+(?:\.\d+)?) matches the first number (min), allowing for optional '-' and decimal.
  // ~ is the literal separator.
  // (-?\d+(?:\.\d+)?) matches the second number (max), same pattern.
  const rangeRegex = /(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/; 
  let matchResult;

  // Keep replacing the first found match until no more matches are found in the string
  // eslint-disable-next-line no-cond-assign
  while ((matchResult = rangeRegex.exec(expressionWithPlaceholders)) !== null) {
    const fullMatch = matchResult[0]; // The entire matched string, e.g., "600~700"
    const minStr = matchResult[1];    // The first captured group (min value string)
    const maxStr = matchResult[2];    // The second captured group (max value string)

    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);

    // Validate parsing; if numbers are not valid, replace with a string
    // that will prevent an infinite loop and likely cause a clear error in mathjs.
    if (isNaN(min) || isNaN(max)) {
      console.warn(`[expressionParser] Failed to parse range from match: "${fullMatch}". Min string: "${minStr}", Max string: "${maxStr}".`);
      // Replace the problematic match with a unique error string to avoid re-matching it infinitely.
      // This part of the string will then likely cause an error in math.js, which is intended behavior for invalid input.
      expressionWithPlaceholders = expressionWithPlaceholders.replace(fullMatch, `_INVALID_RANGE_${varIndex}_`);
      // We don't push to ranges or increment varIndex for an invalid parse here.
      continue; 
    }
    
    ranges.push({ min, max });
    const placeholder = `VAR${varIndex++}`;
    // Replace only the first occurrence of `fullMatch` with the generated placeholder.
    // This is crucial for iterative replacement.
    const indexOfMatch = matchResult.index;
    expressionWithPlaceholders = 
        expressionWithPlaceholders.substring(0, indexOfMatch) + 
        placeholder + 
        expressionWithPlaceholders.substring(indexOfMatch + fullMatch.length);
  }
  
  console.log('[expressionParser] Final expressionWithPlaceholders:', JSON.stringify(expressionWithPlaceholders));
  console.log('[expressionParser] Collected ranges:', JSON.stringify(ranges));

  // Check for malformed VARnVARm patterns, which indicates operators were lost.
  const malformedVarPattern = /VAR\d+VAR\d+/;
  if (malformedVarPattern.test(expressionWithPlaceholders)) {
    const errorMessage = `[expressionParser] CRITICAL PARSER ERROR: Malformed VARnVARm pattern detected in expression: "${expressionWithPlaceholders}". This indicates operators between ranges were lost.`;
    console.error(errorMessage);
    // Depending on desired behavior, you might throw an error here to halt processing:
    // throw new Error(errorMessage); 
  }

  return {
    expression: expressionWithPlaceholders,
    ranges: ranges,
  };
}
