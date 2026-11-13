import jwt from 'jsonwebtoken';

import type { Config } from '../config.js';
import { HttpError } from '../problem.js';
import { ROLES, type Role } from './types.js';

export interface AccessClaims {
  sub: string;
  role: Role;
}

export interface TokenService {
  signAccessToken(user: { id: string; role: Role }): string;
  /** Throws an `HttpError`: 401 `TOKEN_EXPIRED` or 401 `INVALID_TOKEN`. */
  verifyAccessToken(token: string): AccessClaims;
}

const ALGORITHM = 'HS256';

const invalid = () => new HttpError(401, 'INVALID_TOKEN', 'The access token is not valid.');

export function createTokenService(
  {
    jwtAccessSecret,
    accessTokenTtlSeconds,
  }: Pick<Config, 'jwtAccessSecret' | 'accessTokenTtlSeconds'>,
  now: () => Date,
): TokenService {
  // The clock is injected: `iat` is set by hand so `expiresIn` counts from it, and `verify` judges
  // expiry by the same clock. That is what lets a test move time instead of waiting for it.
  const seconds = () => Math.floor(now().getTime() / 1000);

  return {
    signAccessToken: ({ id, role }) =>
      jwt.sign({ role, iat: seconds() }, jwtAccessSecret, {
        algorithm: ALGORITHM,
        subject: id,
        expiresIn: accessTokenTtlSeconds,
      }),

    verifyAccessToken: (token) => {
      let payload: string | jwt.JwtPayload;
      try {
        // Pinning `algorithms` is the defence against `alg: none`: the token's own header never decides.
        payload = jwt.verify(token, jwtAccessSecret, {
          algorithms: [ALGORITHM],
          clockTimestamp: seconds(),
        });
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new HttpError(401, 'TOKEN_EXPIRED', 'The access token has expired.');
        }
        throw invalid();
      }
      // A correctly signed token can still be unusable: check the claims we rely on.
      const role = typeof payload === 'string' ? undefined : payload['role'];
      if (
        typeof payload === 'string' ||
        typeof payload.sub !== 'string' ||
        typeof payload.exp !== 'number' || // a token with no expiry would live forever
        !ROLES.includes(role as Role)
      ) {
        throw invalid();
      }
      return { sub: payload.sub, role: role as Role };
    },
  };
}
