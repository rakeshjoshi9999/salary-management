import { createServer, type Server } from 'node:http';

import { createApp } from './app.js';
import type { Config } from './config.js';
import { connectDb, disconnectDb, pingDb } from './db.js';

export interface RunningServer {
  server: Server;
  /** Stops taking requests, lets in-flight ones finish, then closes the database. Safe to call twice. */
  shutdown: () => Promise<void>;
}

/** Connects to MongoDB, then starts listening, so the port never opens before the app can serve. */
export async function startServer(config: Config): Promise<RunningServer> {
  await connectDb(config.mongodbUri);
  const server = createServer(createApp({ config, ping: pingDb }));

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, () => {
        server.off('error', reject); // later errors must not vanish into a settled promise
        resolve();
      });
    });
  } catch (error) {
    await disconnectDb(); // for example EADDRINUSE: do not leave the connection open
    throw error;
  }

  // Memoised: a second caller (SIGINT after SIGTERM, or a test cleaning up twice) gets the same promise.
  let closing: Promise<void> | undefined;
  const shutdown = () => (closing ??= close(server));
  return { server, shutdown };
}

async function close(server: Server): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections(); // keep-alive sockets would otherwise hold the port open
    });
  } finally {
    await disconnectDb(); // even if the server was already closed, do not leave the connection open
  }
}
