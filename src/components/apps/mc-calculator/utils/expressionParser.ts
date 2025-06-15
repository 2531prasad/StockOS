
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
  
  // Regex to find number~number patterns.
  // It captures the min and max parts.
  const rangeRegex = /(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/g;

  const expressionWithPlaceholders = processedExpr.replace(rangeRegex, (match, minStr, maxStr) => {
    // match is the full matched string, e.g., "600~700"
    // minStr is the first captured group (min value string)
    // maxStr is the second captured group (max value string)
    
    console.log(`[expressionParser] Iteration for varIndex ${varIndex}: Found range match: "${match}", minStr: "${minStr}", maxStr: "${maxStr}"`);

    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);

    if (isNaN(min) || isNaN(max)) {
      console.warn(`[expressionParser] Failed to parse range from match: "${match}". Min string: "${minStr}", Max string: "${maxStr}". Replacing with an error-inducing placeholder.`);
      // This placeholder will likely cause math.js to fail with an "Undefined symbol" error, which is informative.
      return `_INVALID_RANGE_(${match})_`; 
    }
    
    ranges.push({ min, max });
    const placeholder = `VAR${varIndex++}`;
    console.log(`[expressionParser] Replacing "${match}" with "${placeholder}".`);
    return placeholder;
  });
  
  console.log('[expressionParser] Final expressionWithPlaceholders:', JSON.stringify(expressionWithPlaceholders));
  console.log('[expressionParser] Collected ranges:', JSON.stringify(ranges));

  // Check for the malformed pattern. This check happens *after* all replacements.
  const malformedVarPattern = /VAR\d+VAR\d+/; 
  if (malformedVarPattern.test(expressionWithPlaceholders)) {
    const errorMessage = `[expressionParser] CRITICAL PARSER ERROR: Malformed VARnVARm pattern detected in expression: "${expressionWithPlaceholders}". This indicates operators between ranges were lost.`;
    console.error(errorMessage);
    // Depending on desired behavior, you might throw an error here
    // or allow it to proceed and fail in math.js (which it currently does).
  }
  
  // Check for our custom invalid range placeholder
  if (expressionWithPlaceholders.includes("_INVALID_RANGE_")) {
    const invalidRangeMessage = `[expressionParser] Expression contains parts that could not be parsed as valid ranges: "${expressionWithPlaceholders}"`;
    console.error(invalidRangeMessage);
  }

  return {
    expression: expressionWithPlaceholders,
    ranges: ranges,
  };
}
