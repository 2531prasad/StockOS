
// src/components/apps/mc-calculator/utils/expressionParser.ts

export interface ProcessedExpression {
  expression: string;
  isProbabilistic: boolean;
  error?: string | null;
}

function applyCommonSubstitutions(expr: string): string {
  let processedExpr = expr.replace(/,/g, ''); // 1. Remove all commas

  // 2. Normalize incomplete percentage ranges: (N1 op N2%) -> (N1% op N2%)
  // This targets " ( N1 op N2% ) " where N1 is NOT already a percentage.
  // Example: (10 - 20%) becomes (10% - 20%), (10 ~ 20%) becomes (10% ~ 20%)
  const incompletePercentRangePattern = /\(\s*(-?\d+(?:\.\d+)?(?!\s*%))\s*([~-])\s*(-?\d+(?:\.\d+)?)%\s*\)/g;
  processedExpr = processedExpr.replace(incompletePercentRangePattern, (_match, n1, operator, n2) => {
    return `(${n1}% ${operator} ${n2}%)`;
  });

  // 3. Handle Number (P1% - P2%) and Number (P1% ~ P2%) to Number * ( (1+P1/100) ~ (1+P2/100) )
  // This pattern signifies applying a percentage range (as growth/shrinkage) to a preceding number.
  // Example: 500 (10% ~ 20%) becomes 500 * (1.1~1.2)
  // Example: 500 (10% - 20%) also becomes 500 * (1.1~1.2) after step 2 makes it 500 (10% - 20%)
  const numPercentRangePattern = /\b(-?\d+(?:\.\d+)?)\s*\(\s*(-?\d+(?:\.\d+)?)%\s*(~|-)\s*(-?\d+(?:\.\d+)?)%\s*\)/g;
  processedExpr = processedExpr.replace(numPercentRangePattern, (match, numStr, p1Str, _operatorSymbol, p2Str) => {
    // _operatorSymbol is captured but the output for the numeric range factor always uses '~'.
    try {
      const num = parseFloat(numStr);
      const p1 = parseFloat(p1Str);
      const p2 = parseFloat(p2Str);
      if (isNaN(num) || isNaN(p1) || isNaN(p2)) {
        console.warn(`[expressionParser] Invalid number in Number (P% [~|-] P%) pattern: "${match}"`);
        return match; 
      }
      // These represent factors, e.g., 10% becomes 1.1, -10% becomes 0.9
      const val1 = 1 + p1 / 100;
      const val2 = 1 + p2 / 100;
      return `${num} * (${Math.min(val1, val2)}~${Math.max(val1, val2)})`;
    } catch (e) {
      console.warn(`[expressionParser] Error processing Number (P% [~|-] P%) pattern: "${match}"`, e);
      return match;
    }
  });
  
  // 4. General P1% - P2% to P1% ~ P2% (if not already part of the above patterns)
  // This handles standalone percentage ranges.
  // Example: 10% - 20% becomes 10% ~ 20%
  processedExpr = processedExpr.replace(/(-?\d+(?:\.\d+)?)%\s*-\s*(-?\d+(?:\.\d+)?)%/g, '$1% ~ $2%');

  // 5. Standard substitutions
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
  
  const rangeRegex = /(-?\d+(?:\.\d+)?)(%)?\s*~\s*(-?\d+(?:\.\d+)?)(%)?/g;

  let minReplaced = commonSubstitutedExpr.replace(rangeRegex, (match, minPart, minPercent, _maxPart, _maxPercent) => {
    let numMin = parseFloat(minPart);
    if (isNaN(numMin)) {
      console.warn(`[expressionParser] Invalid min value in range for minExpr: "${match}" -> "${minPart}"`);
      return "NaN"; 
    }
    if (minPercent) numMin /= 100;
    return String(numMin);
  });

  let maxReplaced = commonSubstitutedExpr.replace(rangeRegex, (match, _minPart, _minPercent, maxPart, maxPercent) => {
    let numMax = parseFloat(maxPart);
    if (isNaN(numMax)) {
      console.warn(`[expressionParser] Invalid max value in range for maxExpr: "${match}" -> "${maxPart}"`);
      return "NaN";
    }
    if (maxPercent) numMax /= 100;
    return String(numMax);
  });
  
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
  console.log('[expressionParser] Expression after common substitutions:', JSON.stringify(commonSubstitutedExpr));

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
      [numMin, numMax] = [numMax, numMin];
      console.warn(`[expressionParser] Min was greater than Max in range "${match}". Swapped to ${numMin}~${numMax}.`);
    }
    return `sample(range(${numMin}, ${numMax}))`;
  });

  const percentGlobalRegex = /(-?\d+(?:\.\d+)?)%/g;
  mcProcessedExpr = mcProcessedExpr.replace(percentGlobalRegex, '($1/100)');
  
  isProbabilistic = mcProcessedExpr.includes('sample(range(');

  console.log('[expressionParser] Final Monte Carlo preprocessed expression:', JSON.stringify(mcProcessedExpr));
  console.log('[expressionParser] Is probabilistic for Monte Carlo:', isProbabilistic);

  return {
    expression: mcProcessedExpr,
    isProbabilistic,
    error, 
  };
}

