import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Client rules that mirror the API (UI_DESIGN.md, ADR-010, ADR-037, openapi `Money`). */

export const EARLIEST_HIRE_DATE = '1950-01-01';
const MONEY_MAX = 999_999_999_999.99;
const AMOUNT = /^\d+(\.\d+)?$/;

/** Text the API would reject as blank once trimmed. */
export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as string | null;
  return value && value.trim() === '' ? { required: true } : null;
};

/** A valid address whose domain has a dot in it, as the API requires (ADR-037). */
export const emailWithDottedDomain: ValidatorFn = (control) => {
  const value = ((control.value as string | null) ?? '').trim();
  if (value === '') {
    return null;
  }
  if (Validators.email({ value } as AbstractControl)) {
    return { email: true };
  }
  const domain = value.slice(value.lastIndexOf('@') + 1);
  const labels = domain.split('.');
  return labels.length < 2 || labels.some((label) => label === '') ? { email: true } : null;
};

/** A positive amount with at most 2 decimals and at most 12 integer digits. */
export const salary: ValidatorFn = (control) => {
  const value = ((control.value as string | null) ?? '').trim();
  if (value === '') {
    return null;
  }
  if (!AMOUNT.test(value)) {
    return { amount: true };
  }
  if ((value.split('.')[1] ?? '').length > 2) {
    return { decimals: true };
  }
  const amount = Number(value);
  if (amount <= 0) {
    return { positive: true };
  }
  return amount > MONEY_MAX ? { tooLarge: true } : null;
};

/** An ISO date between two ISO dates, inclusive. ISO dates compare correctly as strings. */
export function dateBetween(earliest: string, latest: string): ValidatorFn {
  return (control) => {
    const value = (control.value as string | null) ?? '';
    if (value === '') {
      return null;
    }
    return value < earliest || value > latest ? { dateRange: { earliest, latest } } : null;
  };
}

/** The message shown under a field for its first error. */
export function errorMessage(errors: ValidationErrors | null): string {
  if (!errors) {
    return '';
  }
  if (errors['server']) return errors['server'] as string;
  if (errors['required']) return 'Required';
  if (errors['maxlength']) {
    return `At most ${(errors['maxlength'] as { requiredLength: number }).requiredLength} characters`;
  }
  if (errors['email']) return 'Enter a valid email address';
  if (errors['amount']) return 'Enter an amount, such as 52000.00';
  if (errors['decimals']) return 'At most 2 decimals';
  if (errors['positive']) return 'Must be greater than 0';
  if (errors['tooLarge']) return 'Too large';
  if (errors['dateRange']) {
    const { earliest, latest } = errors['dateRange'] as { earliest: string; latest: string };
    return `Between ${earliest} and ${latest}`;
  }
  return 'Invalid value';
}
