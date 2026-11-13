import type { RequestHandler } from 'express';

import type { TokenService } from './tokens.js';
import type { Role } from './types.js';

/** Reads `Authorization: Bearer <token>`, verifies it and sets `req.user`. */
export function authenticate(_tokens: TokenService): RequestHandler {
  return (_req, _res, next) => {
    next(new Error('Not implemented yet.'));
  };
}

/** A middleware factory: returns the check for one list of allowed roles. */
export function authorize(..._roles: Role[]): RequestHandler {
  return (_req, _res, next) => {
    next();
  };
}
