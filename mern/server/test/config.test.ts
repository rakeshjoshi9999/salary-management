import { describe, expect, it } from 'vitest';

import { ConfigError, loadConfig } from '../src/config.js';

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
    const config = loadConfig({ MONGODB_URI: 'mongodb://localhost:27017/salary' });

    expect(config).toEqual({
      port: 8082,
      mongodbUri: 'mongodb://localhost:27017/salary',
      corsAllowedOrigins: ['http://localhost:5173'],
      nodeEnv: 'development',
    });
  });
});
