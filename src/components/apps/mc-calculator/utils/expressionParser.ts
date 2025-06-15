
export interface PreprocessedExpression {
  expression: string; // Expression with placeholders like VAR0, VAR1
  ranges: { min: number; max: number }[]; // Array of ranges corresponding to placeholders
}

// Define a unique temporary delimiter that's unlikely to appear in expressions
const TEMP_DELIMITER = "@@@";

export function preprocessExpression(expr: string): PreprocessedExpression {
  // 1. Replace 'x' or 'X' with '*' for multiplication
  let processedExpr = expr.replace(/x|X/gi, '*'); // Case-insensitive

  // 2. Remove all whitespace characters
  processedExpr = processedExpr.replace(/\s+/g, '');

  const ranges: { min: number; max: number }[] = [];
  let varIndex = 0;

  // 3. Replace number ranges like "100~120" with "@@@VARn@@@"
  // The regex matches numbers (potentially with decimals, optional leading minus) on either side of a ~
  let expressionWithTempPlaceholders = processedExpr.replace(/(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/g, (_match, minStr, maxStr) => {
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    if (!isNaN(min) && !isNaN(max)) {
      ranges.push({ min, max });
      const placeholder = `VAR${varIndex++}`;
      return `${TEMP_DELIMITER}${placeholder}${TEMP_DELIMITER}`; // Wrap with delimiters
    }
    // This fallback should ideally not be reached if the regex is specific enough
    // and input is well-formed regarding ranges.
    return _match; 
  });

  // 4. Add spaces around operators, but be careful with unary minus.
  // This regex targets binary operators: *, /, +, - (when not unary)
  // It uses lookarounds to ensure minus is binary.
  // (?<=\d|@@@VAR\d+@@@) : Positive lookbehind for a digit or a placeholder
  // (?=\d|@@@VAR\d+@@@|-) : Positive lookahead for a digit, placeholder, or another minus (for chains like A-B-C or A--B)
  // This step is complex and can be error prone. A simpler approach is often better.

  // Simpler: Add spaces around all `*`, `/`, `+`.
  // For `-`, it's trickier. `A-B` -> `A - B`. `-A` -> `-A`. `A*-B` -> `A * -B`.
  // Let's first clean out the TEMP_DELIMITERs where they might be adjacent to operators,
  // ensuring the VARn token is distinct.
  
  // Replace "@@@VARn@@@" with " VARn " to ensure spacing, then clean up.
  let expressionWithSpacedVars = expressionWithTempPlaceholders.replace(new RegExp(`${TEMP_DELIMITER}(VAR\\d+)${TEMP_DELIMITER}`, 'g'), ' $1 ');

  // Add spaces around binary operators: *, /, +
  // For '-', handle carefully to distinguish from unary minus.
  // Replace `*` with ` * `
  expressionWithSpacedVars = expressionWithSpacedVars.replace(/([*\/+])/g, ' $1 ');
  
  // Replace binary minus: number/VAR - number/VAR  OR  ) - number/VAR OR number/VAR - (
  // This is difficult to get perfect with simple regex.
  // Example: `VAR0 * VAR1 - VAR2 - VAR3 - 30 - 20`
  // If it became `VAR0*VAR1-VAR2-VAR3-30-20` (after initial VAR replacement and no spaces)
  // We want `VAR0 * VAR1 - VAR2 - VAR3 - 30 - 20`
  
  // A common strategy for robust spacing:
  // 1. Replace VARn placeholders (done)
  // 2. Add spaces around ALL operators:
  let finalExpression = expressionWithSpacedVars.replace(/([*\/+\-])/g, ' $1 ');
  // 3. Normalize multiple spaces to single space
  finalExpression = finalExpression.replace(/\s\s+/g, ' ').trim();
  // 4. Fix unary minus cases: "A * - B" -> "A * -B", or " - B" at start -> "-B"
  // This can be tricky. `mathjs` usually handles "A * -B" fine if -B is a known symbol or number.
  // And "A - B" is also fine.
  // The key is that `VARn` tokens are distinct from operators.

  // The previous error "Undefined symbol VAR1VAR2VAR3" implies that the hyphens
  // between VAR1, VAR2, VAR3 were *lost*, not just unspaced.
  // The TEMP_DELIMITER approach above was an attempt to ensure VARn tokens don't merge.
  // If hyphens are truly lost, this spacing won't bring them back.
  // The most direct cause of losing operators is if the `replace` function for ranges
  // somehow consumed them or if the intermediate string `processedExpr` was malformed before range replacement.

  // Given the error, the string "VAR1VAR2VAR3" was formed.
  // My previous analysis was that `expressionWithPlaceholders` from the original code
  // *should* be "VAR0*VAR1-VAR2-VAR3-30-20".
  // If that's true, mathjs wouldn't report "Undefined symbol VAR1VAR2VAR3".
  // This implies `expressionWithPlaceholders` in the original code *is* "VAR0*VAR1VAR2VAR3-30-20".

  // The TEMP_DELIMITER strategy is a strong attempt to ensure VARn are separate tokens.
  // After this, we need to make sure operators are correctly placed.
  // The most critical part is that `VARn` and operators are distinct tokens.

  // Let's simplify the final spacing, relying on mathjs's robustness once tokens are clear.
  // Remove the TEMP_DELIMITERs
  finalExpression = expressionWithTempPlaceholders.replace(new RegExp(TEMP_DELIMITER, 'g'), '');

  // Now, ensure there are spaces around binary operators to be safe,
  // this is more for parsing robustness than fixing lost operators.
  // Match operators that are likely binary
  finalExpression = finalExpression.replace(/([+\-*/])/g, ' $1 ');
  finalExpression = finalExpression.replace(/\s\s+/g, ' ').trim();
  // This can still mess up unary minus e.g. " -VAR0 " -> " - VAR0 ".
  // However, "VAR0 * -VAR1" or "VAR0 - -VAR1" should be fine for mathjs if scope provides VAR0 and VAR1.

  // The most critical step to fix "VAR1VAR2VAR3" is ensuring the original `processedExpr.replace`
  // for ranges doesn't cause merging. The TEMP_DELIMITER should help here.

  // If after TEMP_DELIMITER removal, we have "VAR0*VAR1-VAR2-VAR3-30-20", that's what we want.
  // The problem `VAR1VAR2VAR3` meant the "-" were gone. The TEMP_DELIMITER step
  // doesn't remove the "-", it just wraps VARn. So if "-" were already gone,
  // this wouldn't fix it.

  // The issue implies the string fed to `replace` for ranges already had ranges merged or operators missing.
  // Initial `processedExpr.replace(/\s+/g, '')` is fine.
  // Initial `expr.replace(/x|X/gi, '*')` is fine.

  // The error is very specific. It suggests that `0.55~0.65-600~700-100~200` became `VAR1VAR2VAR3`.
  // This would happen if `replace` saw `0.55~0.65`, `-600~700`, `-100~200` as adjacent tokens
  // and somehow removed the operators connecting them. This is not how replace works.

  // Let's use the expression after TEMP_DELIMITER removal, assuming that makes VARn distinct.
  // And rely on math.js to parse `VAR0*VAR1-VAR2-VAR3-30-20` (no extra spaces).
  finalExpression = expressionWithTempPlaceholders.replace(new RegExp(TEMP_DELIMITER, 'g'), '');


  return {
    expression: finalExpression,
    ranges: ranges,
  };
}

    