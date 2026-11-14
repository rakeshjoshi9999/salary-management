import { http, HttpResponse } from 'msw';

/** The supported countries as `GET /reference` sends them (sorted by name). */
export const REFERENCE = {
  countries: [
    { code: 'FR', name: 'France', currency: 'EUR' },
    { code: 'DE', name: 'Germany', currency: 'EUR' },
    { code: 'IN', name: 'India', currency: 'INR' },
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
    { code: 'US', name: 'United States', currency: 'USD' },
  ],
  departments: [{ name: 'Engineering', jobTitles: ['Software Engineer'] }],
};

const currencyOf = (code: string) =>
  REFERENCE.countries.find((country) => country.code === code)?.currency ?? 'XXX';

/** A `CountryInsights` body: empty unless the test gives figures. */
export function insightsBody(code: string, figures: Partial<Record<string, unknown>> = {}) {
  return {
    countryCode: code,
    currency: currencyOf(code),
    salary: { headcount: 0, min: null, max: null, average: null, median: null },
    averageByJobTitle: [],
    headcountByDepartment: [],
    ...figures,
  };
}

/** India with a few figures, used by most dashboard tests. */
export const INDIA = insightsBody('IN', {
  salary: {
    headcount: 3011,
    min: '786119.00',
    max: '2684905.00',
    average: '1427738.35',
    median: '1333082.00',
  },
  averageByJobTitle: [
    {
      jobTitle: 'Engineering Manager',
      department: 'Engineering',
      headcount: 120,
      average: '2240000.00',
    },
    {
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      headcount: 410,
      average: '1400000.00',
    },
    { jobTitle: 'Recruiter', department: 'Human Resources', headcount: 150, average: '1010000.00' },
  ],
  headcountByDepartment: [
    { department: 'Engineering', headcount: 900 },
    { department: 'Sales', headcount: 610 },
  ],
});

/** Germany with figures, for switching tests. */
export const GERMANY = insightsBody('DE', {
  salary: {
    headcount: 1499,
    min: '36647.00',
    max: '123824.00',
    average: '66705.43',
    median: '61882.00',
  },
  averageByJobTitle: [
    {
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      headcount: 200,
      average: '65000.00',
    },
  ],
  headcountByDepartment: [{ department: 'Engineering', headcount: 600 }],
});

/** Answers `/insights/countries/:code` with `body` for that one country. */
export const insightsFor = (code: string, body: ReturnType<typeof insightsBody>) =>
  http.get(`/api/insights/countries/${code}`, () => HttpResponse.json(body));
