import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '../test/server';
import { api, ApiError } from './api';

/** Resolves to whatever `promise` rejects with, and fails the test if it resolves instead. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the request to fail');
}

/** The fetch wrapper: the client's `HttpClient` plus its error interceptor. */
describe('api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. resolves a 2xx response to its parsed JSON body', async () => {
    server.use(http.get('/api/things', () => HttpResponse.json({ name: 'thing', count: 2 })));

    const body = await api<{ name: string; count: number }>('/things');

    expect(body).toEqual({ name: 'thing', count: 2 });
  });

  it('2. sends the request under the /api prefix', async () => {
    let seenPath: string | undefined;
    server.use(
      http.get('*', ({ request }) => {
        seenPath = new URL(request.url).pathname;
        return HttpResponse.json({ status: 'UP' });
      }),
    );

    await api('/health');

    expect(seenPath).toBe('/api/health');
  });

  it('3. turns a Problem Details response into an ApiError with its status, code and detail', async () => {
    server.use(
      http.get('/api/missing', () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Not Found',
            status: 404,
            detail: 'No route for GET /missing.',
            instance: '/missing',
            code: 'NOT_FOUND',
          },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const error = await rejectionOf(api('/missing'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      detail: 'No route for GET /missing.',
    });
  });

  it('4. turns an error response that is not Problem Details into an ApiError with code HTTP_ERROR', async () => {
    // `/health` answers 503 with plain JSON, not Problem Details.
    server.use(
      http.get('/api/health', () => HttpResponse.json({ status: 'DOWN' }, { status: 503 })),
    );

    const error = await rejectionOf(api('/health'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, code: 'HTTP_ERROR' });
    expect((error as ApiError).detail).not.toBe('');
  });

  it('5. turns a network failure into an ApiError with code NETWORK_ERROR and status 0', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));

    const error = await rejectionOf(api('/health'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('6. asks for same-origin credentials, so the refresh cookie travels through the proxy', async () => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'UP' })));
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await api('/health');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });
});
