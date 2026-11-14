import { http } from 'msw';
import { setupServer } from 'msw/node';

import { problem } from './problem';

/**
 * One fake backend for every test. Each test declares the responses it needs with `server.use(...)`,
 * which take precedence. The one default: no refresh cookie, so the app starts signed out (M4) unless a
 * test signs in (`signedInAs` in `test/auth.ts`).
 */
export const server = setupServer(
  http.post('/api/auth/refresh', () => problem(401, 'UNAUTHENTICATED')),
);
