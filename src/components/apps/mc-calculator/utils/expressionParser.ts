
// src/components/apps/mc-calculator/utils/expressionParser.ts

export interface ProcessedExpression {
  expression: string;
  isProbabilistic: boolean;
  error?: string | null;
}

function applyCommonSubstitutions(expr: string): string {
  // Remove all commas first to handle inputs like "1,000" as "1000"
  let processedExpr = expr.replace(/,/g, ''); 
  
  processedExpr = processedExpr.replace(/x|X/gi, '*');
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*\(/g, '$1*(');
  processedExpr = processedExpr.replace(/\)\s*\(/g, ')*(');
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1*$2');
  processedExpr = processedExpr.replace(/\)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, ')*$1');
  processedExpr = processedExpr.replace(/\s+/g, ' ').trim();
  return processedExpr;
}

export function buildMinMaxExpressions(rawUserExpr: string): { minExpr: string, maxExpr: string } {
  const commonSubstitutedExpr = applyCommonSubstitutions(rawUserExpr);
  const rangeRegex = /(-?\d+(?:\.\d+)?)\s*~\s*(-?\d+(?:\.\d+)?)/g;

  const minReplaced = commonSubstitutedExpr.replace(rangeRegex, (match, minPart, maxPart) => {
    const numMin = parseFloat(minPart);
    if (isNaN(numMin)) {
      console.warn(`[expressionParser] Invalid min value in range for minExpr: "${match}" after substitutions: "${minPart}"`);
      return "NaN"; 
    }
    return String(numMin);
  });

  const maxReplaced = commonSubstitutedExpr.replace(rangeRegex, (match, minPart, maxPart) => {
    const numMax = parseFloat(maxPart);
    if (isNaN(numMax)) {
      console.warn(`[expressionParser] Invalid max value in range for maxExpr: "${match}" after substitutions: "${maxPart}"`);
      return "NaN";
    }
    return String(numMax);
  });

  return {
    minExpr: minReplaced, // No need to call applyCommonSubstitutions again, it's done at the start
    maxExpr: maxReplaced, // Same here
  };
}

export function preprocessForMonteCarlo(rawUserExpr: string): ProcessedExpression {
  console.log('[expressionParser] Raw input expression for Monte Carlo:', JSON.stringify(rawUserExpr));
  
  let error: string | null = null;
  let commonSubstitutedExpr = applyCommonSubstitutions(rawUserExpr);
  console.log('[expressionParser] Expression after common substitutions (and comma removal):', JSON.stringify(commonSubstitutedExpr));


  const rangePattern = /(-?\d+(?:\.\d+)?)\s*~\s*(-?\d+(?:\.\d+)?)/g;
  let isProbabilistic = false;

  const mcProcessedExpr = commonSubstitutedExpr.replace(rangePattern, (match, min, max) => {
    isProbabilistic = true; 
    const numMin = parseFloat(min);
    const numMax = parseFloat(max);

    if (isNaN(numMin) || isNaN(numMax)) {
      const errMsg = `Invalid numeric value in range: "${match}" (parsed as min: ${min}, max: ${max}).`;
      if (!error) error = errMsg; 
      console.warn(`[expressionParser] ${errMsg}`);
      return "sample(range(NaN, NaN))"; 
    }
    
    if (numMin > numMax) {
      console.warn(`[expressionParser] Min (${numMin}) is greater than Max (${numMax}) in range "${match}". Simulation will produce NaNs for this part.`);
    }
    return `sample(range(${numMin}, ${numMax}))`;
  });

  isProbabilistic = mcProcessedExpr.includes('sample(range(');

  console.log('[expressionParser] Final Monte Carlo preprocessed expression:', JSON.stringify(mcProcessedExpr));
  console.log('[expressionParser] Is probabilistic for Monte Carlo:', isProbabilistic);

  return {
    expression: mcProcessedExpr,
    isProbabilistic,
    error, 
  };
}

