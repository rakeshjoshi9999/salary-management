import { Router } from 'express';

import type { Config } from '../config.js';
import type { TokenService } from './tokens.js';

export interface AuthRouterDeps {
  config: Config;
  tokens: TokenService;
  now: () => Date;
}

export function createAuthRouter(_deps: AuthRouterDeps): Router {
  return Router();
}
