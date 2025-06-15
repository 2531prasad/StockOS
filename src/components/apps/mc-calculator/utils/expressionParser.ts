
// src/components/apps/mc-calculator/utils/expressionParser.ts

export interface ProcessedExpression {
  expression: string;
  isProbabilistic: boolean;
  error?: string | null;
}

export interface ExtractedRangeInfo {
  placeholder: string;
  minVal: number;
  maxVal: number;
}


function applyCommonSubstitutions(expr: string): string {
  let processedExpr = expr.replace(/,/g, ''); 

  const incompletePercentRangePattern = /\(\s*(-?\d+(?:\.\d+)?(?!\s*%))\s*([~-])\s*(-?\d+(?:\.\d+)?)%\s*\)/g;
  processedExpr = processedExpr.replace(incompletePercentRangePattern, (_match, n1, operator, n2) => {
    return `(${n1}% ${operator} ${n2}%)`;
  });
  
  const numPercentRangePattern = /\b(-?\d+(?:\.\d+)?)\s*\(\s*(-?\d+(?:\.\d+)?)%\s*(~|-)\s*(-?\d+(?:\.\d+)?)%\s*\)/g;
  processedExpr = processedExpr.replace(numPercentRangePattern, (match, numStr, p1Str, _operatorSymbol, p2Str) => {
    try {
      const num = parseFloat(numStr);
      const p1 = parseFloat(p1Str);
      const p2 = parseFloat(p2Str);
      if (isNaN(num) || isNaN(p1) || isNaN(p2)) {
        console.warn(`[expressionParser] Invalid number in Number (P% [~|-] P%) pattern: "${match}"`);
        return match; 
      }
      const val1 = 1 + p1 / 100;
      const val2 = 1 + p2 / 100;
      return `${num} * (${Math.min(val1, val2)}~${Math.max(val1, val2)})`;
    } catch (e) {
      console.warn(`[expressionParser] Error processing Number (P% [~|-] P%) pattern: "${match}"`, e);
      return match;
    }
  });
    
  processedExpr = processedExpr.replace(/(-?\d+(?:\.\d+)?)%\s*-\s*(-?\d+(?:\.\d+)?)%/g, '$1% ~ $2%');
  
  processedExpr = processedExpr.replace(/x|X/gi, '*');
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*\(/g, '$1*('); 
  processedExpr = processedExpr.replace(/\)\s*\(/g, ')*('); 
  processedExpr = processedExpr.replace(/(\d(?:\.\d+)?)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, '$1*$2'); 
  processedExpr = processedExpr.replace(/\)\s*([a-zA-Z_][a-zA-Z0-9_]*)/g, ')*$1'); 
  processedExpr = processedExpr.replace(/\s+/g, ' ').trim();
  return processedExpr;
}


export function substituteRangesWithPlaceholders(
  rawUserExpr: string
): { commonSubstitutedExpr: string, exprWithPlaceholders: string; ranges: ExtractedRangeInfo[], error?: string | null } {
  const commonSubstitutedExpr = applyCommonSubstitutions(rawUserExpr);
  const ranges: ExtractedRangeInfo[] = [];
  let placeholderIndex = 0;
  let substitutionError: string | null = null;

  const rangeRegex = /(-?\d+(?:\.\d+)?)(%)?\s*~\s*(-?\d+(?:\.\d+)?)(%)?/g;

  const exprWithPlaceholders = commonSubstitutedExpr.replace(rangeRegex, (match, minPart, minPercent, maxPart, maxPercent) => {
    const placeholder = `__RANGE_${placeholderIndex++}__`;
    let numMin = parseFloat(minPart);
    let numMax = parseFloat(maxPart);

    if (isNaN(numMin) || isNaN(numMax)) {
        const errMsg = `Invalid numeric value in range: "${match}" (parsed as min: ${minPart}, max: ${maxPart}).`;
        if (!substitutionError) substitutionError = errMsg;
        console.warn(`[expressionParser] ${errMsg}`);
        // Push NaN to keep array length consistent, error will be handled upstream
        ranges.push({ placeholder, minVal: NaN, maxVal: NaN }); 
        return placeholder; // Still return placeholder to avoid breaking expression structure
    }
    
    if (minPercent) numMin /= 100;
    if (maxPercent) numMax /= 100;
    
    if (numMin > numMax) {
      console.warn(`[expressionParser] Min was greater than Max in range "${match}". Swapped to ${numMax}~${numMin}.`);
      [numMin, numMax] = [numMax, numMin]; 
    }

    ranges.push({
      placeholder,
      minVal: numMin,
      maxVal: numMax,
    });
    return placeholder;
  });

  // Math.js handles standalone percentages like '10%' automatically.
  // So, no need for global percentage replacement for analytical part if math.js handles it.

  return { commonSubstitutedExpr, exprWithPlaceholders, ranges, error: substitutionError };
}


export function preprocessForMonteCarlo(rawUserExpr: string): ProcessedExpression {
  console.log('[expressionParser] Raw input expression for Monte Carlo:', JSON.stringify(rawUserExpr));
  
  let error: string | null = null;
  let commonSubstitutedExpr = applyCommonSubstitutions(rawUserExpr);
  console.log('[expressionParser] Expression after common substitutions for MC:', JSON.stringify(commonSubstitutedExpr));

  const rangePattern = /(-?\d+(?:\.\d+)?)(%)?\s*~\s*(-?\d+(?:\.\d+)?)(%)?/g;
  let isProbabilistic = false;

  let mcProcessedExpr = commonSubstitutedExpr.replace(rangePattern, (match, minPart, minPercent, maxPart, maxPercent) => {
    isProbabilistic = true; 
    let numMin = parseFloat(minPart);
    let numMax = parseFloat(maxPart);

    if (isNaN(numMin) || isNaN(numMax)) {
      const errMsg = `Invalid numeric value in range for MC: "${match}" (parsed as min: ${minPart}, max: ${maxPart}).`;
      if (!error) error = errMsg; 
      console.warn(`[expressionParser] ${errMsg}`);
      return "sample(range(NaN, NaN))"; 
    }
    
    if (minPercent) numMin /= 100;
    if (maxPercent) numMax /= 100;
    
    if (numMin > numMax) {
      // For Monte Carlo, swapping is fine and usually desired if user mistyped.
      // For analytical, we also swapped above when creating ExtractedRangeInfo.
      console.warn(`[expressionParser] Min was greater than Max in MC range "${match}". Swapped to ${numMin}~${numMax}.`);
       [numMin, numMax] = [numMax, numMin];
    }
    return `sample(range(${numMin}, ${numMax}))`;
  });

  // This ensures standalone percentages like "50 + 10%" become "50 + (10/100)" for MC simulation
  // if math.js custom functions `sample` and `range` don't inherently process the '%'
  // However, math.evaluate itself handles '%' fine, so this might only be needed if the expression
  // passed to `math.compile` for simulation *must* have percentages pre-converted.
  // Given math.js evaluates '10%' to 0.1, this step is likely redundant if the expression is evaluated directly.
  // But since simulation uses compiled expressions, it's safer to pre-convert.
  const percentGlobalRegex = /(-?\d+(?:\.\d+)?)%/g;
  mcProcessedExpr = mcProcessedExpr.replace(percentGlobalRegex, (_match, val) => `(${val}/100)`);
  
  // Re-check if probabilistic after all transformations
  isProbabilistic = mcProcessedExpr.includes('sample(range(');

  console.log('[expressionParser] Final Monte Carlo preprocessed expression:', JSON.stringify(mcProcessedExpr));
  console.log('[expressionParser] Is probabilistic for Monte Carlo:', isProbabilistic);

  return {
    expression: mcProcessedExpr,
    isProbabilistic,
    error, 
  };
}
