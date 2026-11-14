import { describe, expect, it } from 'vitest';

import { divideHalfEven, formatMinor } from '../src/insights/money.js';

/** Money as integer minor units (ADR-M6): exact formatting and exact HALF_EVEN division. */
describe('money', () => {
  it.each([
    [8_543_219, '85432.19'],
    [5, '0.05'],
    [100, '1.00'],
    [0, '0.00'],
    [123_456_789_012_345n, '1234567890123.45'],
  ])('moneyFormatsMinorUnitsAsDecimalStrings: %s → %s', (minor, expected) => {
    expect(formatMinor(minor)).toBe(expected);
  });

  it('moneyFormatsMinorUnitsAsDecimalStrings: a fractional number is a bug, not a format', () => {
    // A double from `$avg` leaking in must fail loudly, never print "100.025".
    expect(() => formatMinor(10_002.5)).toThrow();
  });

  it.each([
    // [dividend, divisor, quotient in minor units]
    [20_005n, 2n, 10_002n], // 100.025 → 100.02: a tie goes to the even neighbour
    [20_007n, 2n, 10_004n], // 100.035 → 100.04: a tie goes to the even neighbour
    [10n, 3n, 3n], // 3.33… → 3
    [20n, 3n, 7n], // 6.66… → 7
    [140_005n, 4n, 35_001n], // 35001.25 → 35001
    [9n, 3n, 3n], // exact
  ])('divideRoundsHalfEven: %s / %s = %s', (dividend, divisor, quotient) => {
    expect(divideHalfEven(dividend, divisor)).toBe(quotient);
  });
});
