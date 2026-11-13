import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { expectProblem } from './helpers/problem.js';

const ALLOWED = 'http://localhost:5173';
const config: Config = {
  port: 0,
  mongodbUri: 'unused: these tests need no database',
  corsAllowedOrigins: [ALLOWED],
  nodeEnv: 'test',
};

/** Routes that exist only to exercise the middleware around them. */
function testRoutes(): Router {
  const router = Router();
  // No body parser here: the app owns parsing and its size limit, which tests 4 and 5 rely on.
  router.post('/echo', (req, res) => res.json(req.body));
  router.get('/boom', () => {
    throw new Error('secret internal detail');
  });
  router.get('/reject', async () => {
    throw new Error('secret async detail');
  });
  return router;
}

const app = () => createApp({ config, ping: async () => true, routes: testRoutes() });

/** The Express app on its own, with no port and no database (the app factory, lesson 1). */
describe('the app', () => {
  it('answers an unknown route with a 404 Problem Details', async () => {
    const res = await request(app()).get('/nope');

    expectProblem(res, 404, 'NOT_FOUND');
  });

  it('answers malformed JSON with a 400 Problem Details, not an HTML page', async () => {
    const res = await request(app())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"a":');

    expectProblem(res, 400, 'INVALID_JSON');
    expect(res.body.detail).toMatch(/json/i);
  });

  it('enforces the body size limit: a small body passes, an oversized one gets a 413 problem', async () => {
    const post = (text: string) =>
      request(app())
        .post('/echo')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ text }));

    const small = await post('x'.repeat(90_000)); // under Express's 100 kb default
    const big = await post('x'.repeat(150_000));

    expect(small.status).toBe(200);
    expectProblem(big, 413, 'PAYLOAD_TOO_LARGE');
    expect(big.body.detail).toMatch(/too large|limit/i);
  });

  it('answers an unexpected error with a generic 500 and no stack trace', async () => {
    const res = await request(app()).get('/boom');

    expectProblem(res, 500, 'INTERNAL_ERROR');
    expect(res.text).not.toContain('secret internal detail');
    expect(res.body).not.toHaveProperty('stack');
    expect(res.text).not.toMatch(/\bat .+:\d+:\d+/); // a stack frame, e.g. 'at fn (file.ts:1:2)'
  });

  it('sends a rejected async handler to the error middleware (Express 5)', async () => {
    const res = await request(app()).get('/reject');

    expectProblem(res, 500, 'INTERNAL_ERROR');
    expect(res.text).not.toContain('secret async detail');
  });

  it('allows only the configured origins', async () => {
    const allowed = await request(app()).get('/health').set('Origin', ALLOWED);
    const other = await request(app()).get('/health').set('Origin', 'http://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });
});
