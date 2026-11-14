import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { routes } from '../../app/routes';
import { session, signedInAs } from '../../test/auth';
import { problem } from '../../test/problem';
import { currentUrl, renderRoutes } from '../../test/render';
import { server } from '../../test/server';

/** Restoring the session at start-up: the `APP_INITIALIZER` of this app (decision M4-5). */
describe('AuthProvider', () => {
  it('M4-12. showsFullPageLoadingWhileRestoring: nothing but a loading status until the session is known', async () => {
    // Held on a gate the test opens at the end: a refresh left pending forever would keep the shared
    // single-flight promise alive into the next test.
    let openGate = () => {};
    const gate = new Promise<void>((resolve) => (openGate = resolve));
    server.use(
      http.post('/api/auth/refresh', async () => {
        await gate;
        return problem(401, 'UNAUTHENTICATED');
      }),
    );
    renderRoutes(routes, '/');

    expect(await screen.findByRole('status')).toHaveTextContent(/loading/i);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();

    openGate();
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('M4-13. restoresSessionFromRefreshCookie: the refresh cookie and /auth/me sign the user back in', async () => {
    server.use(...signedInAs('HR_MANAGER'));

    renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { name: /insights/i })).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText(/hr manager/i)).toBeInTheDocument();
  });

  it('M4-14. startsAnonymousWithoutASession: the protected home sends the user to log in', async () => {
    const { router } = renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login?from=%2F');
  });

  it('M4-15. strictModeRestoreSendsOneRefresh: running the restore effect twice spends the cookie once', async () => {
    let refreshCalls = 0;
    server.use(
      http.post('/api/auth/refresh', () => {
        refreshCalls += 1;
        return session('t1');
      }),
      signedInAs('VIEWER')[1]!,
    );

    renderRoutes(routes, '/', { strict: true });

    expect(await screen.findByRole('heading', { name: /insights/i })).toBeInTheDocument();
    expect(refreshCalls).toBe(1);
  });
});
