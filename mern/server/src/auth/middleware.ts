import type { RequestHandler } from 'express';

import { HttpError } from '../problem.js';
import type { TokenService } from './tokens.js';
import type { Role } from './types.js';

/** `Authorization: Bearer <token>` (RFC 6750). The scheme name is case-insensitive. */
const BEARER = /^Bearer\s+(\S+)$/i;

/** Reads the bearer token, verifies it and sets `req.user`. Everything after it can trust that. */
export function authenticate(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
    if (!token) {
      // Express 5 sends a thrown error to the error handler, which turns it into Problem Details.
      throw new HttpError(401, 'UNAUTHENTICATED', 'Send an Authorization: Bearer <token> header.');
    }
    const { sub, role } = tokens.verifyAccessToken(token);
    req.user = { id: sub, role };
    next();
  };
}

/**
 * A middleware factory: it takes the allowed roles and returns the check. The returned function keeps
 * `roles` alive through a closure. Run it after `authenticate`.
 */
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      // The route was wired without `authenticate` in front: a mistake, but never an open door.
      throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required.');
    }
    if (!roles.includes(req.user.role)) {
      throw new HttpError(403, 'FORBIDDEN', 'You are not allowed to do this.');
    }
    next();
  };
}
