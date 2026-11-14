/**
 * The supported countries, departments and job titles (ADR-M6): the same set as the Java app's
 * `V2__seed_reference_data.sql`. One source for the types, the Zod and Mongoose validators, the seed and
 * `GET /reference`. `as const` keeps the literal values, so the types below are derived from the data.
 */
export const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
] as const;

export const DEPARTMENTS = [
  {
    name: 'Engineering',
    jobTitles: [
      'Software Engineer',
      'Senior Software Engineer',
      'QA Engineer',
      'Engineering Manager',
    ],
  },
  { name: 'Sales', jobTitles: ['Sales Representative', 'Account Executive', 'Sales Manager'] },
  {
    name: 'Marketing',
    jobTitles: ['Marketing Specialist', 'Content Strategist', 'Marketing Manager'],
  },
  { name: 'Finance', jobTitles: ['Accountant', 'Financial Analyst', 'Finance Manager'] },
  { name: 'Human Resources', jobTitles: ['HR Generalist', 'Recruiter', 'HR Manager'] },
  { name: 'Operations', jobTitles: ['Operations Analyst', 'Operations Manager'] },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['code']; // 'US' | 'GB' | 'IN' | 'DE' | 'FR'
export type Department = (typeof DEPARTMENTS)[number]['name'];
export type JobTitle = (typeof DEPARTMENTS)[number]['jobTitles'][number];

export const COUNTRY_CODES = COUNTRIES.map((country) => country.code);
export const DEPARTMENT_NAMES = DEPARTMENTS.map((department) => department.name);

export function isCountryCode(value: string): value is CountryCode {
  return (COUNTRY_CODES as readonly string[]).includes(value);
}

/** The currency of a supported country: derived, never stored on an employee. */
export function currencyOf(code: CountryCode): string {
  return COUNTRIES.find((country) => country.code === code)!.currency;
}

/** Whether `jobTitle` belongs to `department`. */
export function isTitleInDepartment(jobTitle: string, department: string): boolean {
  const found = DEPARTMENTS.find((candidate) => candidate.name === department);
  return (found?.jobTitles as readonly string[] | undefined)?.includes(jobTitle) ?? false;
}
