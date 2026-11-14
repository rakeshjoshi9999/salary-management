/**
 * One fixed locale for every viewer and machine (amendment to ADR-M6): `'en'` gives ₹1,333,082.00 and
 * €61,882.00. Left unset, `Intl` would follow the machine (`en-IN` → ₹13,33,082.00). The currency follows
 * the country; the locale only decides how the digits are written. Angular twin: CurrencyPipe + LOCALE_ID.
 */
const LOCALE = 'en';

/** `"1333082.00"`, `INR` → `"₹1,333,082.00"`. The API sends exact strings; display is the only rounding-free use of Number. */
export function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).format(Number(amount));
}

/** `3011` → `"3,011"`. */
export function formatCount(count: number): string {
  return new Intl.NumberFormat(LOCALE).format(count);
}
