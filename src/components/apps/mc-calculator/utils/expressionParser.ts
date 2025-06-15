// src/components/apps/mc-calculator/utils/expressionParser.ts

export interface ProcessedExpression {
  expression: string; // The expression string ready for math.js
  isProbabilistic: boolean; // True if 'sample' or 'range' functions are used
}

export function preprocessExpression(expr: string): ProcessedExpression {
  console.log('[expressionParser] Raw input expression:', JSON.stringify(expr));

  let processedExpr = expr.replace(/x|X/gi, '*'); // Handle 'x' or 'X' for multiplication

  // Replace "a~b" with "sample(range(a,b))"
  // This regex correctly captures numbers (integer or decimal, positive or negative)
  const rangePattern = /(-?\d+(?:\.\d+)?)\s*~\s*(-?\d+(?:\.\d+)?)/g;
  processedExpr = processedExpr.replace(rangePattern, (match, min, max) => {
    // Ensure min and max are valid numbers before creating the function call string
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);
    if (isNaN(numMin) || isNaN(numMax)) {
      console.warn(`[expressionParser] Invalid range detected: "${match}". Skipping transformation for this part.`);
      return match; // Return original match if parsing fails, will likely error later but cleaner than embedding "NaN"
    }
    return `sample(range(${numMin}, ${numMax}))`;
  });

  // Handle implicit multiplication:
  // 1. Number before parenthesis: e.g., 5(x) -> 5*(x)
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*\(/g, '$1*(');
  // 2. Parenthesis before parenthesis: e.g., (x)(y) -> (x)*(y)
  processedExpr = processedExpr.replace(/\)\s*\(/g, ')*(');
  // 3. Number before a function/variable name (starts with letter or _): e.g., 5sample -> 5*sample
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1*$2');
  // 4. Parenthesis before a function/variable name: e.g., (x)sample -> (x)*sample
  processedExpr = processedExpr.replace(/\)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, ')*$1');
  
  // Normalize multiple spaces to single spaces, then trim.
  processedExpr = processedExpr.replace(/\s+/g, ' ').trim();

  const isProbabilistic = processedExpr.includes('sample(') || processedExpr.includes('range(');

  console.log('[expressionParser] Final preprocessed expression:', JSON.stringify(processedExpr));
  console.log('[expressionParser] Is probabilistic:', isProbabilistic);

  return {
    expression: processedExpr,
    isProbabilistic,
  };
}
