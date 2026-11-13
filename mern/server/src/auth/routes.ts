import { Router, type Response } from 'express';

import type { Config } from '../config.js';
import { createAuthService, type Session } from './auth.service.js';
import { authenticate } from './middleware.js';
import type { TokenService } from './tokens.js';

export interface AuthRouterDeps {
  config: Config;
  tokens: TokenService;
  now: () => Date;
}

const COOKIE = 'refreshToken';

export function createAuthRouter({ config, tokens, now }: AuthRouterDeps): Router {
  const router = Router();
  const service = createAuthService(config, tokens, now);

  // `HttpOnly`: JavaScript cannot read it (XSS). `SameSite=Strict`: sent only from our own site (CSRF).
  // `Path=/auth`: the browser attaches it to these routes only. `Secure`: HTTPS only, in production.
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    path: '/auth',
    secure: config.nodeEnv === 'production',
  } as const;

  /** The access token goes in the body (kept in memory by the client); the refresh token in the cookie. */
  function sendSession(res: Response, session: Session): void {
    res.cookie(COOKIE, session.refreshToken, {
      ...cookieOptions,
      maxAge: config.refreshTokenTtlSeconds * 1000, // Express takes milliseconds here
    });
    res.json({
      accessToken: session.accessToken,
      tokenType: 'Bearer', // the names RFC 6749 (OAuth 2.0) uses
      expiresIn: config.accessTokenTtlSeconds,
    });
  }

  router.post('/register', async (req, res) => {
    // Express 5 leaves `req.body` undefined when there is no body.
    res.status(201).json(await service.register(req.body ?? {}));
  });

  router.post('/login', async (req, res) => {
    sendSession(res, await service.login(req.body ?? {}));
  });

  router.post('/refresh', async (req, res) => {
    sendSession(res, await service.refresh(req.cookies?.[COOKIE]));
  });

  router.post('/logout', async (req, res) => {
    await service.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, cookieOptions).status(204).end();
  });

  /** Who the token says I am. Reads nothing from the database: the token is the proof. */
  router.get('/me', authenticate(tokens), (req, res) => {
    res.json(req.user);
  });

  return router;
}
