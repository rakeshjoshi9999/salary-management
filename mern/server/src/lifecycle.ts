import { createServer, type Server } from 'node:http';

import { createApp } from './app.js';
import type { Config } from './config.js';
import { pingDb } from './db.js';

export interface RunningServer {
  server: Server;
  shutdown: () => Promise<void>;
}

export async function startServer(config: Config): Promise<RunningServer> {
  const server = createServer(createApp({ config, ping: pingDb }));
  return { server, shutdown: async () => undefined };
}
