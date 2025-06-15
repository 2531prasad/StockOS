
// This file is no longer strictly needed by monteCarlo.ts or expressionParser.ts
// as the range logic is now embedded.
// However, it might be useful for other purposes or future enhancements.
// For now, I'll leave its content as is, but it's not actively used in the core simulation loop.

export class Range {
  min: number;
  max: number;

  constructor(min: number, max: number) {
    if (min > max) throw new Error("Range min must be <= max");
    this.min = min;
    this.max = max;
  }

  sample(): number {
    return Math.random() * (this.max - this.min) + this.min;
  }

  static fromString(input: string): Range | null {
    const match = input.match(/(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/);
    if (match) {
      const [, minStr, , maxStr] = match; // Note: original regex had unescaped '.'
      // Corrected regex for general use would be /(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/
      // For this static method, if it's used elsewhere, ensure robust parsing.
      const minNum = parseFloat(minStr);
      const maxNum = parseFloat(maxStr);
      if (!isNaN(minNum) && !isNaN(maxNum)) {
        return new Range(minNum, maxNum);
      }
    }
    return null;
  }

  toString(): string {
    return `${this.min}~${this.max}`;
  }
}
