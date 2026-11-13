import express, { type Express, type Router } from 'express';

import type { Config } from './config.js';

export interface AppDeps {
  config: Config;
  /** Whether the database answers; injected so most tests need no database. */
  ping: () => Promise<boolean>;
  /** Routes mounted before the 404 and error handlers. */
  routes?: Router;
}

export function createApp(_deps: AppDeps): Express {
  return express();
}
