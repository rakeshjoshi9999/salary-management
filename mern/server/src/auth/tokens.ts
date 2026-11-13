import type { Config } from '../config.js';
import type { Role } from './types.js';

export interface AccessClaims {
  sub: string;
  role: Role;
}

export interface TokenService {
  signAccessToken(user: { id: string; role: Role }): string;
  /** Throws an `HttpError`: 401 `TOKEN_EXPIRED` or 401 `INVALID_TOKEN`. */
  verifyAccessToken(token: string): AccessClaims;
}

export function createTokenService(
  _config: Pick<Config, 'jwtAccessSecret' | 'accessTokenTtlSeconds'>,
  _now: () => Date,
): TokenService {
  return {
    signAccessToken: () => '',
    verifyAccessToken: () => {
      throw new Error('Not implemented yet.');
    },
  };
}
