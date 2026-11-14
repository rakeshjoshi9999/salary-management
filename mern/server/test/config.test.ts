import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../src/config.js';
import { SECRET } from './helpers/auth.js';

/** Configuration comes from the environment and is checked once, at startup (twelve-factor). */
describe('loadConfig', () => {
  it('rejects a missing or invalid environment, listing every problem', () => {
    let error: unknown;
    try {
      loadConfig({ PORT: 'abc' });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConfigError);
    const issues = (error as ConfigError).issues.join(' | ');
    expect(issues).toMatch(/MONGODB_URI/);
    expect(issues).toMatch(/PORT/);
  });

  it('rejects blank values: an empty `PORT=` line is a mistake, not port 0', () => {
    for (const blank of ['', '   ']) {
      let error: unknown;
      try {
        loadConfig({ MONGODB_URI: blank, PORT: blank });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(ConfigError);
      const issues = (error as ConfigError).issues.join(' | ');
      expect(issues).toMatch(/MONGODB_URI/);
      expect(issues).toMatch(/PORT/);
    }
  });

  it('applies defaults for everything except the database address', () => {
    const config = loadConfig({
      MONGODB_URI: 'mongodb://localhost:27017/salary',
      JWT_ACCESS_SECRET: SECRET,
    });

    expect(config).toEqual({
      port: 8082,
      mongodbUri: 'mongodb://localhost:27017/salary',
      corsAllowedOrigins: ['http://localhost:5173'],
      nodeEnv: 'development',
      jwtAccessSecret: SECRET,
      accessTokenTtlSeconds: 15 * 60,
      refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
      refreshCookiePath: '/auth',
    });
  });

  describe('configRequiresALongEnoughJwtSecret', () => {
    const issuesFor = (secret?: string): string => {
      try {
        loadConfig({ MONGODB_URI: 'mongodb://localhost:27017/salary', JWT_ACCESS_SECRET: secret });
      } catch (caught) {
        return (caught as ConfigError).issues.join(' | ');
      }
      throw new Error('Expected loadConfig to throw.');
    };

    it.each([
      ['missing', undefined],
      ['31 characters, too short to resist guessing', 'x'.repeat(31)],
    ])('rejects a secret that is %s', (_name, secret) => {
      expect(issuesFor(secret)).toMatch(/JWT_ACCESS_SECRET/);
    });

    it('accepts a secret of 32 characters', () => {
      expect(
        loadConfig({
          MONGODB_URI: 'mongodb://localhost:27017/salary',
          JWT_ACCESS_SECRET: 'x'.repeat(32),
        }).jwtAccessSecret,
      ).toBe('x'.repeat(32));
    });
  });

  it('rejects blank values: an empty `PORT=` line is a mistake, not port 0', () => {
    for (const blank of ['', '   ']) {
      let error: unknown;
      try {
        loadConfig({ MONGODB_URI: blank, PORT: blank });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(ConfigError);
      const issues = (error as ConfigError).issues.join(' | ');
      expect(issues).toMatch(/MONGODB_URI/);
      expect(issues).toMatch(/PORT/);
    }
  });

  it('applies defaults for everything except the database address', () => {
    const config = loadConfig({
      MONGODB_URI: 'mongodb://localhost:27017/salary',
      JWT_ACCESS_SECRET: SECRET,
    });

    expect(config).toEqual({
      port: 8082,
      mongodbUri: 'mongodb://localhost:27017/salary',
      corsAllowedOrigins: ['http://localhost:5173'],
      nodeEnv: 'development',
      jwtAccessSecret: SECRET,
      accessTokenTtlSeconds: 15 * 60,
      refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
      refreshCookiePath: '/auth',
    });
  });

  it('configRequiresALongEnoughJwtSecret', () => {
    const issuesFor = (secret?: string) => {
      try {
        loadConfig({ MONGODB_URI: 'mongodb://localhost:27017/salary', JWT_ACCESS_SECRET: secret });
      } catch (caught) {
        return (caught as ConfigError).issues.join(' | ');
      }
      return '';
    };

    expect(issuesFor(undefined)).toMatch(/JWT_ACCESS_SECRET/); // missing
    expect(issuesFor('x'.repeat(31))).toMatch(/JWT_ACCESS_SECRET/); // too short to resist guessing
    expect(issuesFor('x'.repeat(32))).toBe('');
  });

  describe('readsRefreshCookiePathDefaultingToAuth', () => {
    const base = { MONGODB_URI: 'mongodb://localhost:27017/salary', JWT_ACCESS_SECRET: SECRET };

    it('reads the path the browser uses for the auth routes', () => {
      expect(loadConfig({ ...base, REFRESH_COOKIE_PATH: '/api/auth' }).refreshCookiePath).toBe(
        '/api/auth',
      );
    });

    it.each([
      ['relative', 'api/auth'],
      ['empty', ''],
      ['blank', '  '],
    ])('rejects a %s path', (_name, path) => {
      expect(() => loadConfig({ ...base, REFRESH_COOKIE_PATH: path })).toThrow(
        /REFRESH_COOKIE_PATH/,
      );
    });
  });
});
