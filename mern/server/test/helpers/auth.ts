import { createHash } from 'node:crypto';

import type { Express } from 'express';
import request, { type Response } from 'supertest';

import { createTokenService } from '../../src/auth/tokens.js';
import type { Role } from '../../src/auth/types.js';
import type { Config } from '../../src/config.js';

export const SECRET = 'a-test-secret-that-is-at-least-32-characters-long';

export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    port: 0,
    mongodbUri: 'unused: set by the test when it needs a database',
    corsAllowedOrigins: [],
    nodeEnv: 'test',
    jwtAccessSecret: SECRET,
    accessTokenTtlSeconds: 15 * 60,
    refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
    ...overrides,
  };
}

/**
 * A clock the test moves by hand, so token expiry is deterministic. It starts in 2030 on purpose:
 * MongoDB's TTL monitor deletes documents whose `expiresAt` is in the real past, and a fixed date in
 * the past would let it delete refresh tokens in the middle of a test.
 */
export function fakeClock(start = '2030-01-01T00:00:00.000Z') {
  let current = new Date(start).getTime();
  return {
    now: () => new Date(current),
    advance: (ms: number) => {
      current += ms;
    },
  };
}

export const sha256Hex = (value: string) => createHash('sha256').update(value).digest('hex');

export const COOKIE_NAME = 'refreshToken';

/** The whole `Set-Cookie` header for the refresh token, or undefined when the response sets none. */
export function setCookieHeader(res: Response): string | undefined {
  const headers = res.headers['set-cookie'] as string[] | undefined;
  return headers?.find((header) => header.startsWith(`${COOKIE_NAME}=`));
}

/** The raw refresh token the server put in the cookie. */
export function refreshTokenFrom(res: Response): string {
  const header = setCookieHeader(res);
  if (!header) {
    throw new Error('The response did not set a refresh token cookie.');
  }
  return header.slice(COOKIE_NAME.length + 1).split(';')[0]!;
}

export const withCookie = (token: string) => `${COOKIE_NAME}=${token}`;

export const PASSWORD = 'correct horse battery';

/** Registers and logs in through the API, as a real client would. */
export async function registerAndLogin(app: Express, email: string, password = PASSWORD) {
  const registered = await request(app).post('/auth/register').send({ email, password });
  const login = await request(app).post('/auth/login').send({ email, password });
  return {
    id: registered.body.id as string,
    accessToken: login.body.accessToken as string,
    refreshToken: refreshTokenFrom(login),
  };
}

/** An `Authorization` header for a signed-in user of `role`, without a database (signs the token directly). */
export function bearerFor(config: Config, now: () => Date, role: Role = 'VIEWER'): string {
  return `Bearer ${createTokenService(config, now).signAccessToken({ id: 'u1', role })}`;
}
