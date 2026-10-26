import { Employee, ReferenceData } from '../api.models';

/** Shared test data. Not imported by application code. */
export const REFERENCE: ReferenceData = {
  countries: [
    { code: 'DE', name: 'Germany', currency: 'EUR' },
    { code: 'IN', name: 'India', currency: 'INR' },
  ],
  departments: [
    { name: 'Engineering', jobTitles: ['QA Engineer', 'Software Engineer'] },
    { name: 'Sales', jobTitles: ['Account Executive'] },
  ],
};

export function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 101,
    fullName: 'Asha Rao',
    email: 'asha.rao@acme.example',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    countryCode: 'IN',
    currency: 'INR',
    salary: 2400000,
    hireDate: '2021-04-12',
    version: 3,
    ...overrides,
  };
}
