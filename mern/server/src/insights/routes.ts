import { Router } from 'express';

import { authenticate } from '../auth/middleware.js';
import type { TokenService } from '../auth/tokens.js';
import { HttpError } from '../problem.js';
import { isCountryCode } from '../reference/data.js';
import { countryInsights } from './insights.js';

/** `GET /insights/countries/:countryCode`: any signed-in user (ADR-M6). */
export function createInsightsRouter(tokens: TokenService): Router {
  const router = Router();
  // `authenticate` runs first: an anonymous caller gets 401 for every code, so cannot probe which exist.
  router.get('/insights/countries/:countryCode', authenticate(tokens), async (req, res) => {
    const { countryCode } = req.params;
    // Exact, uppercase codes only: `in` is not India. A path parameter that names nothing is a 404.
    if (typeof countryCode !== 'string' || !isCountryCode(countryCode)) {
      throw new HttpError(
        404,
        'COUNTRY_NOT_FOUND',
        `No supported country with code ${countryCode}.`,
      );
    }
    res.json(await countryInsights(countryCode));
  });
  return router;
}
