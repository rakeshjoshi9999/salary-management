import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installFakeLocks } from '../test/locks';
import { problem } from '../test/problem';
import { server } from '../test/server';
import { api, ApiError } from './api';
import { onSessionExpired } from './session';
import { getAccessToken, setAccessToken } from './token';

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

/** Auth in the wrapper: the bearer token, and the reactive single-flight refresh (ADR-M5). */
describe('api with a session', () => {
  let refreshCalls = 0;
  const expired = vi.fn();
  let unsubscribe = () => {};

  const session = (accessToken: string) =>
    HttpResponse.json({ accessToken, tokenType: 'Bearer', expiresIn: 900 });

  /** `/auth/refresh` answering with `token` and counting calls. */
  const refreshGives = (token: string) =>
    http.post('/api/auth/refresh', () => {
      refreshCalls += 1;
      return session(token);
    });

  /** `/things` accepting only `token`; any other bearer gets 401 TOKEN_EXPIRED. */
  const thingsAccept = (token: string, onRefused = () => {}) =>
    http.get('/api/things', ({ request }) => {
      if (request.headers.get('Authorization') === `Bearer ${token}`) {
        return HttpResponse.json({ ok: true });
      }
      onRefused();
      return problem(401, 'TOKEN_EXPIRED');
    });

  beforeEach(() => {
    refreshCalls = 0;
    expired.mockClear();
    unsubscribe = onSessionExpired(expired);
    setAccessToken('old');
  });

  afterEach(() => {
    unsubscribe();
    setAccessToken(null);
  });

  it('M4-3. sendsBearerTokenWhenSignedIn: sends the token when one is held, and nothing when not', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get('/api/things', ({ request }) => {
        seen.push(request.headers.get('Authorization'));
        return HttpResponse.json({ ok: true });
      }),
    );

    await api('/things');
    setAccessToken(null);
    await api('/things');

    expect(seen).toEqual(['Bearer old', null]);
  });

  it('M4-4. refreshesOnTokenExpiredThenReplays: a 401 TOKEN_EXPIRED refreshes once, then the replay succeeds', async () => {
    server.use(thingsAccept('new'), refreshGives('new'));

    const body = await api('/things');

    expect(body).toEqual({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(getAccessToken()).toBe('new');
    expect(expired).not.toHaveBeenCalled();
  });

  it.each([
    ['without', false],
    ['with', true],
  ])(
    'M4-5. concurrentExpiredRequestsShareOneRefresh: three parallel 401s cause one refresh (%s Web Locks)',
    async (_label, withLocks) => {
      const locks = withLocks ? installFakeLocks() : undefined;
      try {
        // The refresh stays pending until all three requests have been refused: no clock involved.
        let openGate = () => {};
        const gate = new Promise<void>((resolve) => (openGate = resolve));
        let refused = 0;
        server.use(
          thingsAccept('new', () => {
            refused += 1;
            if (refused === 3) openGate();
          }),
          http.post('/api/auth/refresh', async () => {
            refreshCalls += 1;
            await gate;
            return session('new');
          }),
        );

        const bodies = await Promise.all([api('/things'), api('/things'), api('/things')]);

        expect(bodies).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
        expect(refreshCalls).toBe(1);
      } finally {
        locks?.uninstall();
      }
    },
  );

  it('M4-6. refreshRunsInsideAWebLock: only the refresh holds the auth-refresh lock, not the requests', async () => {
    const locks = installFakeLocks();
    try {
      server.use(
        thingsAccept('new', () => locks.events.push('things refused')),
        http.post('/api/auth/refresh', () => {
          locks.events.push('refresh');
          return session('new');
        }),
      );

      await api('/things');

      expect(locks.events).toEqual([
        'things refused',
        'acquire auth-refresh',
        'refresh',
        'release auth-refresh',
      ]);
    } finally {
      locks.uninstall();
    }
  });

  it.each(['INVALID_TOKEN', 'UNAUTHENTICATED'])(
    'M4-7. doesNotRefreshOnOtherUnauthorizedCodes: %s is thrown as it is, with no expiry signal',
    async (code) => {
      server.use(
        http.get('/api/things', () => problem(401, code)),
        refreshGives('new'),
      );

      const error = await rejectionOf(api('/things'));

      expect(error).toMatchObject({ status: 401, code });
      expect(refreshCalls).toBe(0);
      expect(expired).not.toHaveBeenCalled();
    },
  );

  it('M4-8. replaysOnlyOnce: a replay refused again fails, with no second refresh and no expiry signal', async () => {
    // The refresh proved the session is alive: fail this request, keep the user signed in (engineer's call).
    server.use(thingsAccept('never'), refreshGives('new'));

    const error = await rejectionOf(api('/things'));

    expect(error).toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' });
    expect(refreshCalls).toBe(1);
    expect(expired).not.toHaveBeenCalled();
  });

  // The credential endpoints never refresh (engineer's call): login, register, refresh and logout.
  // /auth/me is protected by the access token and refreshes like any other request.
  it.each(['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'])(
    'M4-9. neverRefreshesForAuthEndpoints: a 401 TOKEN_EXPIRED from %s is thrown, with no refresh',
    async (path) => {
      let calls = 0;
      // Every POST to /api/auth/* (the refresh included) counts; only the request itself may arrive.
      server.use(
        http.post('/api/auth/*', () => {
          calls += 1;
          return problem(401, 'TOKEN_EXPIRED');
        }),
      );

      const error = await rejectionOf(api(path, { method: 'POST' }));

      expect(error).toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' });
      expect(calls).toBe(1);
      expect(expired).not.toHaveBeenCalled();
    },
  );

  it('M4-9. neverRefreshesForAuthEndpoints: /auth/me is not one of them, it refreshes and replays', async () => {
    server.use(
      http.get('/api/auth/me', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer new'
          ? HttpResponse.json({ id: 'u1', role: 'VIEWER' })
          : problem(401, 'TOKEN_EXPIRED'),
      ),
      refreshGives('new'),
    );

    const me = await api('/auth/me');

    expect(me).toEqual({ id: 'u1', role: 'VIEWER' });
    expect(refreshCalls).toBe(1);
  });

  it('M4-10. failedRefreshClearsTokenAndSignalsExpiry: the token is dropped and listeners hear it', async () => {
    server.use(
      thingsAccept('new'),
      http.post('/api/auth/refresh', () => problem(401, 'TOKEN_EXPIRED')),
    );

    const error = await rejectionOf(api('/things'));

    expect(error).toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('M4-11. throwsInvalidResponseForNonJsonSuccess: a 2xx page that is not JSON is an ApiError', async () => {
    // What a missing Vercel rewrite looks like: index.html with status 200.
    server.use(
      http.get('/api/things', () => HttpResponse.html('<!doctype html><title>app</title>')),
    );

    const error = await rejectionOf(api('/things'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 200, code: 'INVALID_RESPONSE' });
  });
});
