import { connect, type AddressInfo } from 'node:net';

import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { Config } from '../src/config.js';
import { connectDb } from '../src/db.js';
import { startServer, type RunningServer } from '../src/lifecycle.js';
import { startMongo } from './helpers/mongo.js';

/** Starting, checking and stopping the server against a real MongoDB (lesson 1: the lifecycle). */
describe('the server lifecycle', () => {
  let mongo: Awaited<ReturnType<typeof startMongo>>;

  beforeAll(async () => {
    mongo = await startMongo();
  });

  afterAll(async () => {
    await mongo.stop();
  });

  // Whatever a test starts is shut down afterwards, even when an assertion failed first: a leaked
  // listener or open connection would otherwise poison the next test (the connection is global).
  let running: RunningServer | undefined;
  afterEach(async () => {
    await running?.shutdown();
    running = undefined;
  });

  const config = (): Config => ({
    port: 0, // a free port, chosen by the OS
    mongodbUri: mongo.uri,
    corsAllowedOrigins: [],
    nodeEnv: 'test',
  });

  it('reports UP on /health while MongoDB is connected', async () => {
    running = await startServer(config());

    const res = await request(running.server).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'UP' });
  });

  it('reports DOWN with a 503 on /health once the connection has closed', async () => {
    running = await startServer(config());
    // The later shutdown() meets an already closed connection and must cope with it.
    await mongoose.connection.close();

    const res = await request(running.server).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'DOWN' });
  });

  it('closes the port and the database connection on shutdown, and can be called twice', async () => {
    running = await startServer(config());
    expect(running.server.listening).toBe(true);
    const { port } = running.server.address() as AddressInfo;
    expect(mongoose.connection.readyState).toBe(1); // connected

    await running.shutdown();
    await running.shutdown(); // a second SIGTERM must not throw

    expect(running.server.listening).toBe(false);
    expect(await canConnect(port)).toBe(false);
    expect(mongoose.connection.readyState).toBe(0); // disconnected
  });
});

/** Whether anything accepts a TCP connection on the port: the real proof that it is closed. */
function canConnect(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

describe('connecting to MongoDB', () => {
  it('fails fast when the database cannot be reached', async () => {
    // Nothing listens on port 1; without a short timeout this would wait 30 seconds.
    await expect(
      connectDb('mongodb://127.0.0.1:1/none', { serverSelectionTimeoutMS: 300 }),
    ).rejects.toThrow();
  });
});
