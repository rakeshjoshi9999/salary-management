/**
 * Money is integer minor units (ADR-M6): exact, unlike JavaScript's binary `number` for decimals.
 * Arithmetic that can produce fractions (averages, medians) runs in `BigInt` and rounds HALF_EVEN, the
 * banker's rounding the contract asks for (Java's RoundingMode.HALF_EVEN).
 */

/** `8543219` → `"85432.19"`. Refuses a fractional number: that is a bug (a double leaking in), not money. */
export function formatMinor(minor: bigint | number): string {
  if (typeof minor === 'number' && !Number.isSafeInteger(minor)) {
    throw new RangeError(`Not a whole number of minor units: ${minor}`);
  }
  const value = BigInt(minor);
  if (value < 0n) {
    throw new RangeError(`Salaries are positive: ${minor}`);
  }
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
}

/**
 * `dividend / divisor` rounded to a whole number HALF_EVEN: a remainder of exactly half goes to the even
 * neighbour (2.5 → 2, 3.5 → 4), so ties do not all lean one way. Inputs are non-negative.
 */
export function divideHalfEven(dividend: bigint, divisor: bigint): bigint {
  if (divisor <= 0n || dividend < 0n) {
    throw new RangeError('divideHalfEven expects a non-negative dividend and a positive divisor.');
  }
  const quotient = dividend / divisor; // BigInt division truncates
  const twiceRemainder = (dividend % divisor) * 2n;
  if (twiceRemainder > divisor) return quotient + 1n;
  if (twiceRemainder < divisor) return quotient;
  return quotient % 2n === 0n ? quotient : quotient + 1n;
}
