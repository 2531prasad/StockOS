// This file is no longer used by the core simulation logic
// and can be safely deleted or kept for reference.
// To signify it's unused, I'll clear its content.

// export class Range {
//   min: number;
//   max: number;

//   constructor(min: number, max: number) {
//     if (min > max) throw new Error("Range min must be <= max");
//     this.min = min;
//     this.max = max;
//   }

//   sample(): number {
//     return Math.random() * (this.max - this.min) + this.min;
//   }

//   static fromString(input: string): Range | null {
//     const match = input.match(/(-?\d+(?:\.\d+)?)~(-?\d+(?:\.\d+)?)/);
//     if (match) {
//       const [, minStr, , maxStr] = match; 
//       const minNum = parseFloat(minStr);
//       const maxNum = parseFloat(maxStr);
//       if (!isNaN(minNum) && !isNaN(maxNum)) {
//         return new Range(minNum, maxNum);
//       }
//     }
//     return null;
//   }

//   toString(): string {
//     return `${this.min}~${this.max}`;
//   }
// }
