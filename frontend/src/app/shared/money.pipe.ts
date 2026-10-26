import { Pipe, PipeTransform } from '@angular/core';

const FORMAT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * `INR 2,400,000.00`: ISO code, en-US grouping, always 2 decimals (UI_DESIGN.md Formatting).
 * Formatting only; the UI never calculates with money (ADR-015). The code is added by hand because
 * Intl's own `currencyDisplay: 'code'` separates it with a non-breaking space.
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency: string): string {
    if (value === null || value === undefined) {
      return '';
    }
    return `${currency} ${FORMAT.format(value)}`;
  }
}
