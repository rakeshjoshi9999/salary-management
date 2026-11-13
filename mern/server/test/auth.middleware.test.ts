import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { authenticate, authorize } from '../src/auth/middleware.js';
import { createTokenService } from '../src/auth/tokens.js';
import { fakeClock, testConfig } from './helpers/auth.js';
import { expectProblem } from './helpers/problem.js';

const USER_ID = '665f1c2e8f1b2c0012345678';
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** `authenticate` and `authorize` (lesson 3: middleware, 401 versus 403). No database is needed. */
describe('authentication and authorization middleware', () => {
  const clock = fakeClock();
  const config = testConfig();
  const tokens = createTokenService(config, clock.now);

  function routes(): Router {
    const router = Router();
    router.get('/protected', authenticate(tokens), (_req, res) => {
      res.json({ ok: true });
    });
    router.get('/hr-only', authenticate(tokens), authorize('HR_MANAGER'), (_req, res) => {
      res.json({ ok: true });
    });
    return router;
  }
  const app = () => createApp({ config, ping: async () => true, now: clock.now, routes: routes() });
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('rejectsAMissingToken', async () => {
    const res = await request(app()).get('/protected');

    expectProblem(res, 401, 'UNAUTHENTICATED');
  });

  it('rejectsAnExpiredToken', async () => {
    const token = tokens.signAccessToken({ id: USER_ID, role: 'VIEWER' });
    clock.advance((config.accessTokenTtlSeconds + 1) * 1000);

    const res = await request(app()).get('/protected').set(bearer(token));

    expectProblem(res, 401, 'TOKEN_EXPIRED');
  });

  it('rejectsATamperedToken', async () => {
    const [header, payload, signature] = tokens
      .signAccessToken({ id: USER_ID, role: 'VIEWER' })
      .split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    const forged = [header, b64({ ...claims, role: 'HR_MANAGER' }), signature].join('.');

    const res = await request(app()).get('/protected').set(bearer(forged));

    expectProblem(res, 401, 'INVALID_TOKEN');
  });

  it('rejectsAnUnsignedAlgNoneToken', async () => {
    const now = Math.floor(clock.now().getTime() / 1000);
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
      sub: USER_ID,
      role: 'HR_MANAGER',
      iat: now,
      exp: now + 600,
    })}.`;

    const res = await request(app()).get('/protected').set(bearer(unsigned));

    expectProblem(res, 401, 'INVALID_TOKEN');
  });

  it('setsTheUserFromAValidToken', async () => {
    const token = tokens.signAccessToken({ id: USER_ID, role: 'VIEWER' });

    const res = await request(app()).get('/auth/me').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: USER_ID, role: 'VIEWER' });
  });

  it('allowsAListedRole', async () => {
    const token = tokens.signAccessToken({ id: USER_ID, role: 'HR_MANAGER' });

    const res = await request(app()).get('/hr-only').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejectsAnotherRoleWithForbidden', async () => {
    const token = tokens.signAccessToken({ id: USER_ID, role: 'VIEWER' });

    const res = await request(app()).get('/hr-only').set(bearer(token));

    expectProblem(res, 403, 'FORBIDDEN');
  });
});
