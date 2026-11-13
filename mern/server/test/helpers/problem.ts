import { expect } from 'vitest';
import type { Response } from 'supertest';

/** An RFC 7807 Problem Details response: the shape every error from the API has. */
export function expectProblem(res: Response, status: number): void {
  expect(res.status).toBe(status);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(res.body).toMatchObject({
    type: expect.any(String),
    title: expect.any(String),
    status,
    detail: expect.any(String),
    instance: expect.any(String),
  });
}
