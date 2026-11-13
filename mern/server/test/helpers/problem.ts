import { expect } from 'vitest';
import type { Response } from 'supertest';

/**
 * An RFC 9457 Problem Details response (the successor of RFC 7807): the shape every error from the API
 * has, plus `code`, a stable machine-readable extension the client branches on instead of the message.
 */
export function expectProblem(res: Response, status: number, code: string): void {
  expect(res.status).toBe(status);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(res.body).toMatchObject({
    type: expect.any(String),
    title: expect.any(String),
    status,
    detail: expect.any(String),
    instance: expect.any(String),
    code,
  });
}
