import jwt, { type JwtPayload } from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.js';
import { RefreshToken } from '../src/auth/refresh-token.model.js';
import { User } from '../src/auth/user.model.js';
import { connectDb, disconnectDb } from '../src/db.js';
import type { Config } from '../src/config.js';
import {
  PASSWORD,
  fakeClock,
  refreshTokenFrom,
  registerAndLogin,
  setCookieHeader,
  sha256Hex,
  testConfig,
  withCookie,
} from './helpers/auth.js';
import { startMongo } from './helpers/mongo.js';
import { expectProblem } from './helpers/problem.js';

/** Register, login, refresh and logout end to end, against a real MongoDB (lessons 4 to 10). */
describe('the auth endpoints', () => {
  let mongo: Awaited<ReturnType<typeof startMongo>>;
  const clock = fakeClock();

  beforeAll(async () => {
    mongo = await startMongo();
    await connectDb(mongo.uri);
    await User.init();
    await RefreshToken.init();
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const app = (config: Config = testConfig()) =>
    createApp({ config, ping: async () => true, now: clock.now });

  describe('POST /auth/register', () => {
    it('registerCreatesAViewer', async () => {
      const res = await request(app())
        .post('/auth/register')
        .send({ email: 'ana@example.com', password: PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        email: 'ana@example.com',
        role: 'VIEWER',
      });
    });

    it('registerIgnoresARoleInTheBody', async () => {
      const res = await request(app())
        .post('/auth/register')
        .send({ email: 'eve@example.com', password: PASSWORD, role: 'HR_MANAGER' });

      expect(res.status).toBe(201);
      expect(res.body.role).toBe('VIEWER');
      expect((await User.findOne({ email: 'eve@example.com' }))?.role).toBe('VIEWER');
    });

    it('registerRejectsADuplicateEmail', async () => {
      await request(app())
        .post('/auth/register')
        .send({ email: 'ana@example.com', password: PASSWORD });

      const res = await request(app())
        .post('/auth/register')
        .send({ email: 'ANA@example.com', password: PASSWORD });

      expectProblem(res, 409, 'EMAIL_TAKEN');
    });

    it('registerRejectsAPasswordLongerThan72Bytes', async () => {
      // 40 characters but 80 bytes: bcrypt would silently ignore everything after byte 72.
      const res = await request(app())
        .post('/auth/register')
        .send({ email: 'ana@example.com', password: 'é'.repeat(40) });

      expectProblem(res, 400, 'VALIDATION_FAILED');
      expect(res.body.detail).toMatch(/password/i);
    });

    it.each([
      ['an invalid email', { email: 'not-an-email', password: PASSWORD }, /email/i],
      [
        'a password under 8 characters',
        { email: 'ana@example.com', password: 'short' },
        /password/i,
      ],
    ])('registerRejectsInvalidInput: %s', async (_name, body, field) => {
      const res = await request(app()).post('/auth/register').send(body);

      expectProblem(res, 400, 'VALIDATION_FAILED');
      expect(res.body.detail).toMatch(field);
    });
  });

  describe('POST /auth/login', () => {
    it('loginReturnsAnAccessTokenAndSetsTheRefreshCookie', async () => {
      await request(app())
        .post('/auth/register')
        .send({ email: 'ana@example.com', password: PASSWORD });

      const res = await request(app())
        .post('/auth/login')
        .send({ email: 'ana@example.com', password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      const cookie = setCookieHeader(res)!;
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/auth');
      expect(cookie).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
    });

    it('loginMarksTheRefreshCookieSecureInProduction', async () => {
      const production = app(testConfig({ nodeEnv: 'production' }));
      await request(production)
        .post('/auth/register')
        .send({ email: 'ana@example.com', password: PASSWORD });

      const res = await request(production)
        .post('/auth/login')
        .send({ email: 'ana@example.com', password: PASSWORD });

      expect(setCookieHeader(res)).toContain('Secure');
    });

    it('accessTokenCarriesSubjectRoleAndAFifteenMinuteExpiry', async () => {
      const { id, accessToken } = await registerAndLogin(app(), 'ana@example.com');

      const claims = jwt.decode(accessToken) as JwtPayload;

      expect(claims.sub).toBe(id);
      expect(claims['role']).toBe('VIEWER');
      expect(claims.iat).toBe(Math.floor(clock.now().getTime() / 1000));
      expect(claims.exp! - claims.iat!).toBe(15 * 60);
    });

    it('loginTreatsUnknownEmailAndWrongPasswordIdentically', async () => {
      await request(app())
        .post('/auth/register')
        .send({ email: 'ana@example.com', password: PASSWORD });

      const wrongPassword = await request(app())
        .post('/auth/login')
        .send({ email: 'ana@example.com', password: 'not the password' });
      const unknownEmail = await request(app())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: PASSWORD });

      expectProblem(wrongPassword, 401, 'INVALID_CREDENTIALS');
      expectProblem(unknownEmail, 401, 'INVALID_CREDENTIALS');
      expect(unknownEmail.body).toEqual(wrongPassword.body); // nothing reveals which emails exist
    });

    it('loginStoresOnlyAHashOfTheRefreshToken', async () => {
      const { refreshToken } = await registerAndLogin(app(), 'ana@example.com');

      const records = await RefreshToken.find().lean();

      expect(records).toHaveLength(1);
      expect(records[0]!.tokenHash).toBe(sha256Hex(refreshToken));
      expect(JSON.stringify(records)).not.toContain(refreshToken);
    });
  });

  describe('POST /auth/refresh', () => {
    it('refreshRotatesTheToken', async () => {
      const { refreshToken } = await registerAndLogin(app(), 'ana@example.com');

      const res = await request(app())
        .post('/auth/refresh')
        .set('Cookie', withCookie(refreshToken));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      expect(refreshTokenFrom(res)).not.toBe(refreshToken);
      const records = await RefreshToken.find().lean();
      expect(records).toHaveLength(2);
      const old = records.find((record) => record.tokenHash === sha256Hex(refreshToken));
      expect(old?.usedAt).toBeTruthy();
      expect(new Set(records.map((record) => record.familyId)).size).toBe(1);
    });

    it('replayingAUsedTokenRevokesTheWholeFamily', async () => {
      const { refreshToken: first } = await registerAndLogin(app(), 'ana@example.com');
      const rotated = await request(app()).post('/auth/refresh').set('Cookie', withCookie(first));
      const second = refreshTokenFrom(rotated);

      const replay = await request(app()).post('/auth/refresh').set('Cookie', withCookie(first));
      const afterwards = await request(app())
        .post('/auth/refresh')
        .set('Cookie', withCookie(second));

      expectProblem(replay, 401, 'REFRESH_TOKEN_REUSED');
      expectProblem(afterwards, 401, 'INVALID_TOKEN'); // even the newest token died with the family
    });

    it('twoSimultaneousRefreshesOfOneTokenLeaveNoLiveToken', async () => {
      const { refreshToken } = await registerAndLogin(app(), 'ana@example.com');
      const { familyId } = (await RefreshToken.findOne().lean())!;

      // Both requests can read the token as unused; only an atomic update lets one of them win. Two
      // parties held one token, so reuse detection must end the family however the race falls: the
      // winner may get a 200 whose token is revoked a moment later, or be refused too.
      const results = await Promise.all([
        request(app()).post('/auth/refresh').set('Cookie', withCookie(refreshToken)),
        request(app()).post('/auth/refresh').set('Cookie', withCookie(refreshToken)),
      ]);

      const refused = results.filter((res) => res.status !== 200);
      expect(refused.length).toBeGreaterThanOrEqual(1); // never two successes
      refused.forEach((res) => expectProblem(res, 401, 'REFRESH_TOKEN_REUSED'));
      expect(await RefreshToken.countDocuments({ familyId })).toBe(0); // no live token survives
    });

    it('refreshRevokesItsSuccessorIfTheFamilyWasRevokedMidRotation', async () => {
      const { refreshToken } = await registerAndLogin(app(), 'ana@example.com');
      const { familyId } = (await RefreshToken.findOne().lean())!;
      // A replay elsewhere revokes the family after this request claimed the token but before it
      // stored its successor. Without a re-check, the successor would live on in a revoked family.
      const create = RefreshToken.create.bind(RefreshToken) as (
        ...args: unknown[]
      ) => Promise<unknown>;
      vi.spyOn(RefreshToken, 'create').mockImplementationOnce((async (...args: unknown[]) => {
        await RefreshToken.deleteMany({ familyId });
        return create(...args);
      }) as never);

      const res = await request(app())
        .post('/auth/refresh')
        .set('Cookie', withCookie(refreshToken));

      expectProblem(res, 401, 'REFRESH_TOKEN_REUSED');
      expect(await RefreshToken.countDocuments({ familyId })).toBe(0);
    });

    it('treatsAMalformedRefreshCookieAsNoToken', async () => {
      // cookie-parser turns a `j:` cookie into an object; the server must not trust the type.
      const malformed = 'refreshToken=j:{"a":1}';

      const refresh = await request(app()).post('/auth/refresh').set('Cookie', malformed);
      const logout = await request(app()).post('/auth/logout').set('Cookie', malformed);

      expectProblem(refresh, 401, 'UNAUTHENTICATED');
      expect(logout.status).toBe(204);
    });

    it('rejectsAnExpiredRefreshToken', async () => {
      const { refreshToken } = await registerAndLogin(app(), 'ana@example.com');
      clock.advance((7 * 24 * 60 * 60 + 1) * 1000);

      const res = await request(app())
        .post('/auth/refresh')
        .set('Cookie', withCookie(refreshToken));

      expectProblem(res, 401, 'TOKEN_EXPIRED');
    });

    it('rejectsAMissingRefreshToken', async () => {
      const res = await request(app()).post('/auth/refresh');

      expectProblem(res, 401, 'UNAUTHENTICATED');
    });

    it('refreshReadsTheCurrentRoleFromTheDatabase', async () => {
      const { id, refreshToken } = await registerAndLogin(app(), 'ana@example.com');
      await User.updateOne({ _id: id }, { role: 'HR_MANAGER' }); // promoted after she logged in

      const res = await request(app())
        .post('/auth/refresh')
        .set('Cookie', withCookie(refreshToken));

      expect((jwt.decode(res.body.accessToken) as JwtPayload)['role']).toBe('HR_MANAGER');
    });
  });

  describe('the refresh cookie behind a proxy (ADR-M5)', () => {
    it('setsAndClearsRefreshCookieOnConfiguredPath', async () => {
      // The browser sees /api/auth/... through the proxy; the cookie must name that path to come back.
      const proxied = app(testConfig({ refreshCookiePath: '/api/auth' }));
      await request(proxied)
        .post('/auth/register')
        .send({ email: 'ana@example.com', password: PASSWORD });

      const login = await request(proxied)
        .post('/auth/login')
        .send({ email: 'ana@example.com', password: PASSWORD });
      const set = setCookieHeader(login)!;
      expect(set).toContain('Path=/api/auth;');

      const logout = await request(proxied)
        .post('/auth/logout')
        .set('Cookie', withCookie(refreshTokenFrom(login)));
      const cleared = setCookieHeader(logout)!;
      expect(cleared).toMatch(/^refreshToken=;/);
      expect(cleared).toContain('Path=/api/auth;');
    });
  });

  describe('POST /auth/logout', () => {
    it('logoutRevokesTheFamilyAndClearsTheCookie', async () => {
      const { refreshToken } = await registerAndLogin(app(), 'ana@example.com');

      const res = await request(app()).post('/auth/logout').set('Cookie', withCookie(refreshToken));

      expect(res.status).toBe(204);
      const cleared = setCookieHeader(res)!;
      expect(cleared).toMatch(/^refreshToken=;/);
      expect(cleared).toContain('Path=/auth');
      expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
      const reuse = await request(app())
        .post('/auth/refresh')
        .set('Cookie', withCookie(refreshToken));
      expectProblem(reuse, 401, 'INVALID_TOKEN');
    });
  });

  describe('the refresh token collection', () => {
    it('refreshTokensExpireViaATtlIndex', async () => {
      const indexes = await RefreshToken.collection.indexes();

      const ttl = indexes.find((index) => index.key && 'expiresAt' in index.key);
      expect(ttl?.expireAfterSeconds).toBe(0); // delete each document when its own expiresAt passes
    });
  });
});
