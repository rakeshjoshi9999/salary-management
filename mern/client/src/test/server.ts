import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { insightsBody, REFERENCE } from './insights';
import { problem } from './problem';

/**
 * One fake backend for every test. Each test declares the responses it needs with `server.use(...)`,
 * which take precedence. The defaults: no refresh cookie, so the app starts signed out (M4) unless a test
 * signs in (`signedInAs` in `test/auth.ts`); the reference data; and an empty country for insights (M5),
 * so a test that only signs in lands on an empty dashboard without declaring it.
 */
export const server = setupServer(
  http.post('/api/auth/refresh', () => problem(401, 'UNAUTHENTICATED')),
  http.get('/api/reference', () => HttpResponse.json(REFERENCE)),
  // Like the real API: a supported code is an empty country, anything else is 404 COUNTRY_NOT_FOUND.
  http.get('/api/insights/countries/:code', ({ params }) => {
    const code = String(params['code']);
    return REFERENCE.countries.some((country) => country.code === code)
      ? HttpResponse.json(insightsBody(code))
      : problem(404, 'COUNTRY_NOT_FOUND');
  }),
);
