
// src/components/apps/mc-calculator/utils/expressionParser.ts

export interface ProcessedExpression {
  expression: string;
  isProbabilistic: boolean;
  error?: string | null;
}

function applyCommonSubstitutions(expr: string): string {
  let processedExpr = expr.replace(/,/g, ''); // Remove all commas first

  // Handle Number (P1% - P2%) and Number (P1% ~ P2%) to Number * ( (1+P1/100) ~ (1+P2/100) )
  const numPercentRangePattern = /\b(-?\d+(?:\.\d+)?)\s*\(\s*(-?\d+(?:\.\d+)?)%\s*(~|-)\s*(-?\d+(?:\.\d+)?)%\s*\)/g;
  processedExpr = processedExpr.replace(numPercentRangePattern, (match, numStr, p1Str, _, p2Str) => {
    try {
      const num = parseFloat(numStr);
      const p1 = parseFloat(p1Str);
      const p2 = parseFloat(p2Str);
      if (isNaN(num) || isNaN(p1) || isNaN(p2)) {
        console.warn(`[expressionParser] Invalid number in Number (P% ~ P%) pattern: "${match}"`);
        return match; // Fallback to original match if parsing fails
      }
      // Ensure the resulting range is min ~ max, even if input P1 > P2
      const val1 = 1 + p1 / 100;
      const val2 = 1 + p2 / 100;
      return `${num} * (${Math.min(val1, val2)}~${Math.max(val1, val2)})`;
    } catch (e) {
      console.warn(`[expressionParser] Error processing Number (P% ~ P%) pattern: "${match}"`, e);
      return match;
    }
  });
  
  // General P1% - P2% to P1% ~ P2% (if not already part of the above pattern)
  processedExpr = processedExpr.replace(/(-?\d+(?:\.\d+)?)%\s*-\s*(-?\d+(?:\.\d+)?)%/g, '$1% ~ $2%');

  // Standard substitutions
  processedExpr = processedExpr.replace(/x|X/gi, '*');
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*\(/g, '$1*('); // number before parenthesis
  processedExpr = processedExpr.replace(/\)\s*\(/g, ')*('); // parenthesis before parenthesis
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1*$2'); // number before variable/function
  processedExpr = processedExpr.replace(/\)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, ')*$1'); // parenthesis before variable/function
  processedExpr = processedExpr.replace(/\s+/g, ' ').trim();
  return processedExpr;
}

export function buildMinMaxExpressions(rawUserExpr: string): { minExpr: string, maxExpr: string } {
  const commonSubstitutedExpr = applyCommonSubstitutions(rawUserExpr);
  
  // Regex to find A% ~ B% or A ~ B% or A% ~ B or A ~ B
  const rangeRegex = /(-?\d+(?:\.\d+)?)(%)?\s*~\s*(-?\d+(?:\.\d+)?)(%)?/g;

  let minReplaced = commonSubstitutedExpr;
  let maxReplaced = commonSubstitutedExpr;

  minReplaced = minReplaced.replace(rangeRegex, (match, minPart, minPercent, maxPart, maxPercent) => {
    let numMin = parseFloat(minPart);
    if (isNaN(numMin)) {
      console.warn(`[expressionParser] Invalid min value in range for minExpr: "${match}" -> "${minPart}"`);
      return "NaN";
    }
    if (minPercent) numMin /= 100;
    return String(numMin);
  });

  maxReplaced = maxReplaced.replace(rangeRegex, (match, minPart, minPercent, maxPart, maxPercent) => {
    let numMax = parseFloat(maxPart);
    if (isNaN(numMax)) {
      console.warn(`[expressionParser] Invalid max value in range for maxExpr: "${match}" -> "${maxPart}"`);
      return "NaN";
    }
    if (maxPercent) numMax /= 100;
    return String(numMax);
  });
  
  // Global pass for any remaining standalone N%
  const percentGlobalRegex = /(-?\d+(?:\.\d+)?)%/g;
  minReplaced = minReplaced.replace(percentGlobalRegex, '($1/100)');
  maxReplaced = maxReplaced.replace(percentGlobalRegex, '($1/100)');

  return {
    minExpr: minReplaced,
    maxExpr: maxReplaced,
  };
}

export function preprocessForMonteCarlo(rawUserExpr: string): ProcessedExpression {
  console.log('[expressionParser] Raw input expression for Monte Carlo:', JSON.stringify(rawUserExpr));
  
  let error: string | null = null;
  let commonSubstitutedExpr = applyCommonSubstitutions(rawUserExpr);
  console.log('[expressionParser] Expression after common substitutions (and comma/percentage patterns):', JSON.stringify(commonSubstitutedExpr));

  // Regex to find A% ~ B% or A ~ B% or A% ~ B or A ~ B
  const rangePattern = /(-?\d+(?:\.\d+)?)(%)?\s*~\s*(-?\d+(?:\.\d+)?)(%)?/g;
  let isProbabilistic = false;

  let mcProcessedExpr = commonSubstitutedExpr.replace(rangePattern, (match, minPart, minPercent, maxPart, maxPercent) => {
    isProbabilistic = true; 
    let numMin = parseFloat(minPart);
    let numMax = parseFloat(maxPart);

    if (isNaN(numMin) || isNaN(numMax)) {
      const errMsg = `Invalid numeric value in range: "${match}" (parsed as min: ${minPart}, max: ${maxPart}).`;
      if (!error) error = errMsg; 
      console.warn(`[expressionParser] ${errMsg}`);
      return "sample(range(NaN, NaN))"; 
    }
    
    if (minPercent) numMin /= 100;
    if (maxPercent) numMax /= 100;
    
    if (numMin > numMax) {
      // Swap them to ensure min <= max for the range function.
      // This is important if user writes 20% ~ 10%
      [numMin, numMax] = [numMax, numMin];
      console.warn(`[expressionParser] Min was greater than Max in range "${match}". Swapped to ${numMin}~${numMax}.`);
    }
    return `sample(range(${numMin}, ${numMax}))`;
  });

  // Global pass for any remaining standalone N%
  const percentGlobalRegex = /(-?\d+(?:\.\d+)?)%/g;
  mcProcessedExpr = mcProcessedExpr.replace(percentGlobalRegex, '($1/100)');
  
  // Check if probabilistic based on if sample(range( was actually used
  // (it might not be if all ranges were invalid and returned NaN strings instead)
  isProbabilistic = mcProcessedExpr.includes('sample(range(');

  console.log('[expressionParser] Final Monte Carlo preprocessed expression:', JSON.stringify(mcProcessedExpr));
  console.log('[expressionParser] Is probabilistic for Monte Carlo:', isProbabilistic);

  return {
    expression: mcProcessedExpr,
    isProbabilistic,
    error, 
  };
}
