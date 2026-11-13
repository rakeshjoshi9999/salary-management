import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type Router } from 'express';

import { createAuthRouter } from './auth/routes.js';
import { createTokenService } from './auth/tokens.js';
import type { Config } from './config.js';
import { createErrorHandler, notFound } from './problem.js';

export interface AppDeps {
  config: Config;
  /** Whether the database answers; injected so most tests need no database. */
  ping: () => Promise<boolean>;
  /** Routes mounted before the 404 and error handlers. */
  routes?: Router;
  /** The clock, injected so tests control token expiry. Defaults to the real time. */
  now?: () => Date;
}

/** Larger bodies get a 413. Set here, by the app, so it holds for every route. */
export const BODY_LIMIT = '100kb';

/**
 * Builds the Express app without listening on a port. Keeping that apart is what makes it testable: a
 * test calls the app directly, and `server.ts` is the only place that opens a socket. The order of
 * `use` calls is the order requests flow through, so the 404 and error handlers come last.
 */
export function createApp({ config, ping, routes, now = () => new Date() }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by'); // do not advertise the framework

  app.use(cors({ origin: config.corsAllowedOrigins }));
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(cookieParser()); // fills `req.cookies`; the refresh token travels in a cookie

  app.get('/health', async (_req, res) => {
    const up = await ping();
    res.status(up ? 200 : 503).json({ status: up ? 'UP' : 'DOWN' });
  });

  const tokens = createTokenService(config, now);
  app.use('/auth', createAuthRouter({ config, tokens, now }));

  if (routes) {
    app.use(routes);
  }

  app.use(notFound);
  // Expected errors are not logged; in tests nothing is, so a deliberate failure stays quiet.
  app.use(createErrorHandler(config.nodeEnv === 'test' ? () => undefined : console.error));
  return app;
}
