import { Router } from 'express';

import { authenticate } from '../auth/middleware.js';
import type { TokenService } from '../auth/tokens.js';
import { COUNTRIES, DEPARTMENTS } from './data.js';

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'en');

/** Built once: the data only changes with a deploy. Sorted for dropdowns (the Java contract). */
const REFERENCE = {
  countries: [...COUNTRIES]
    .sort(byName)
    .map(({ code, name, currency }) => ({ code, name, currency })),
  departments: [...DEPARTMENTS].sort(byName).map(({ name, jobTitles }) => ({
    name,
    jobTitles: [...jobTitles].sort((a, b) => a.localeCompare(b, 'en')),
  })),
};

/** `GET /reference`: countries with currencies, departments with titles. Any signed-in user. */
export function createReferenceRouter(tokens: TokenService): Router {
  const router = Router();
  router.get('/reference', authenticate(tokens), (_req, res) => {
    // Static between deploys: the browser may reuse it for an hour without asking.
    res.set('Cache-Control', 'public, max-age=3600').json(REFERENCE);
  });
  return router;
}
