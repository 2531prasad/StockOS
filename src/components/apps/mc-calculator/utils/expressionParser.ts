// src/components/apps/mc-calculator/utils/expressionParser.ts

export interface ProcessedExpression {
  expression: string;
  isProbabilistic: boolean;
  error?: string | null;
}

function applyCommonSubstitutions(expr: string): string {
  let processedExpr = expr.replace(/x|X/gi, '*');
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*\(/g, '$1*(');
  processedExpr = processedExpr.replace(/\)\s*\(/g, ')*(');
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1*$2');
  processedExpr = processedExpr.replace(/\)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, ')*$1');
  processedExpr = processedExpr.replace(/\s+/g, ' ').trim();
  return processedExpr;
}

export function buildMinMaxExpressions(rawUserExpr: string): { minExpr: string, maxExpr: string } {
  const rangeRegex = /(-?\d+(?:\.\d+)?)\s*~\s*(-?\d+(?:\.\d+)?)/g;

  const minReplaced = rawUserExpr.replace(rangeRegex, (match, minPart, maxPart) => {
    const numMin = parseFloat(minPart);
    if (isNaN(numMin)) {
      console.warn(`[expressionParser] Invalid min value in range for minExpr: "${match}"`);
      return "NaN"; 
    }
    return String(numMin);
  });

  const maxReplaced = rawUserExpr.replace(rangeRegex, (match, minPart, maxPart) => {
    const numMax = parseFloat(maxPart);
    if (isNaN(numMax)) {
      console.warn(`[expressionParser] Invalid max value in range for maxExpr: "${match}"`);
      return "NaN";
    }
    return String(numMax);
  });

  return {
    minExpr: applyCommonSubstitutions(minReplaced),
    maxExpr: applyCommonSubstitutions(maxReplaced),
  };
}

export function preprocessForMonteCarlo(rawUserExpr: string): ProcessedExpression {
  console.log('[expressionParser] Raw input expression for Monte Carlo:', JSON.stringify(rawUserExpr));
  
  let error: string | null = null;
  let commonSubstitutedExpr = applyCommonSubstitutions(rawUserExpr);

  const rangePattern = /(-?\d+(?:\.\d+)?)\s*~\s*(-?\d+(?:\.\d+)?)/g;
  let isProbabilistic = false;

  const mcProcessedExpr = commonSubstitutedExpr.replace(rangePattern, (match, min, max) => {
    isProbabilistic = true; // Mark as probabilistic if any valid ~ range is found
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);

    if (isNaN(numMin) || isNaN(numMax)) {
      const errMsg = `Invalid numeric value in range: "${match}".`;
      if (!error) error = errMsg; // Capture first error
      console.warn(`[expressionParser] ${errMsg}`);
      return "sample(range(NaN, NaN))"; 
    }
    
    // This warning is useful but the simulation will proceed with potentially NaN values if min > max
    if (numMin > numMax) {
      console.warn(`[expressionParser] Min (${numMin}) is greater than Max (${numMax}) in range "${match}". Simulation will produce NaNs for this part.`);
    }
    return `sample(range(${numMin}, ${numMax}))`;
  });

  // After all replacements, re-check if isProbabilistic is truly set by successful `sample(range(` substitution
  // This covers cases where a ~ might have existed but was malformed and didn't convert.
  isProbabilistic = mcProcessedExpr.includes('sample(range(');

  console.log('[expressionParser] Final Monte Carlo preprocessed expression:', JSON.stringify(mcProcessedExpr));
  console.log('[expressionParser] Is probabilistic for Monte Carlo:', isProbabilistic);

  return {
    expression: mcProcessedExpr,
    isProbabilistic,
    error, // Return accumulated error
  };
}
