import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { api } from '../lib/api';
import { getAccessToken } from '../lib/token';
import { session, signedInAs } from '../test/auth';
import { problem } from '../test/problem';
import { currentUrl, renderRoutes } from '../test/render';
import { server } from '../test/server';
import { routes } from './routes';

/** The route table inside the app shell, rendered at a URL as the browser would. */
describe('the app routes', () => {
  it('11. renders the shell, with its header and navigation, around the current route', async () => {
    // Rewritten in M5 (approved): the health page is gone; the shell is checked around Insights at /.
    server.use(...signedInAs('VIEWER'));
    renderRoutes(routes, '/');

    expect(
      within(await screen.findByRole('banner')).getByText(/salary management/i),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: /insights/i })).toHaveAttribute('href', '/');
    const main = screen.getByRole('main');
    expect(await within(main).findByRole('heading', { name: /insights/i })).toBeInTheDocument();
  });

  it('13. shows a not-found page with a link home for an unknown URL', async () => {
    renderRoutes(routes, '/nope');

    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
  });
});

/** The app once auth exists: what is public, what is protected, and how a session ends (M4). */
describe('the app routes with auth', () => {
  it('M4-27. rootIsProtectedHome: a signed-in user sees the protected home at /', async () => {
    server.use(...signedInAs('VIEWER'));

    renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { name: /insights/i })).toBeInTheDocument();
  });

  it('M4-29. headerShowsRoleAndSignsOut: the role is shown, and signing out ends the session', async () => {
    let logoutCalls = 0;
    server.use(
      ...signedInAs('HR_MANAGER'),
      http.post('/api/auth/logout', () => {
        logoutCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router, queryClient } = renderRoutes(routes, '/');
    const banner = await screen.findByRole('banner');
    expect(await within(banner).findByText(/hr manager/i)).toBeInTheDocument();
    queryClient.setQueryData(['salaries'], ['cached for the previous user']);

    await userEvent.setup().click(within(banner).getByRole('button', { name: /sign out/i }));

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(logoutCalls).toBe(1);
    expect(queryClient.getQueryData(['salaries'])).toBeUndefined();
    expect(getAccessToken()).toBeNull();
  });

  // Added after the step 3 implementation review: a refresh that starts while the logout request is in
  // flight used to put a token back after sign-out (the next reload would then sign the user back in).
  it('M4-29b. signOutCannotBeUndoneByARefreshStartedDuringLogout: no token survives signing out', async () => {
    let openLogout = () => {};
    const logoutGate = new Promise<void>((resolve) => (openLogout = resolve));
    let refreshCalls = 0;
    server.use(...signedInAs('HR_MANAGER'));
    renderRoutes(routes, '/');
    const banner = await screen.findByRole('banner');
    await within(banner).findByText(/hr manager/i);
    server.use(
      http.post('/api/auth/logout', async () => {
        await logoutGate;
        return new HttpResponse(null, { status: 204 });
      }),
      // A request sent with a bearer token finds it expired; one sent without a token is just refused.
      http.get('/api/things', ({ request }) =>
        request.headers.get('Authorization')
          ? problem(401, 'TOKEN_EXPIRED')
          : problem(401, 'UNAUTHENTICATED'),
      ),
      http.post('/api/auth/refresh', () => {
        refreshCalls += 1;
        return session('t2');
      }),
    );

    await userEvent.setup().click(within(banner).getByRole('button', { name: /sign out/i }));
    await api('/things').catch(() => undefined); // starts while the logout request is still pending
    openLogout();

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
    expect(refreshCalls).toBe(0);
  });

  it('M4-30. expiredSessionMidUseRedirectsWithReason: a refused refresh during use ends at the login page', async () => {
    server.use(...signedInAs('VIEWER'));
    const { router, queryClient } = renderRoutes(routes, '/');
    expect(await screen.findByRole('heading', { name: /insights/i })).toBeInTheDocument();
    queryClient.setQueryData(['salaries'], ['cached for this user']);
    // Later: the access token expires and the refresh cookie is refused (expired or revoked).
    server.use(
      http.get('/api/things', () => problem(401, 'TOKEN_EXPIRED')),
      http.post('/api/auth/refresh', () => problem(401, 'TOKEN_EXPIRED')),
    );

    await api('/things').catch(() => undefined);

    expect(await screen.findByText(/your session has expired/i)).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login?from=%2F&reason=expired');
    expect(queryClient.getQueryData(['salaries'])).toBeUndefined();
  });
});

/** M5: the health page is gone, and the Catalog placeholder moves off the home page. */
describe('the app routes after M5', () => {
  it('M5-30. healthIsGoneFromTheUi: no Health link for a signed-out user either', async () => {
    renderRoutes(routes, '/login');

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /health/i })).not.toBeInTheDocument();
  });

  it('M5-30. healthIsGoneFromTheUi: no Health link, and /health is not a page', async () => {
    server.use(...signedInAs('VIEWER'));
    renderRoutes(routes, '/health');

    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation')).queryByRole('link', { name: /health/i }),
    ).not.toBeInTheDocument();
  });

  it('M5-31. catalogPlaceholderMovesToCatalogRoute: protected, and linked from the navigation', async () => {
    server.use(...signedInAs('VIEWER'));
    renderRoutes(routes, '/catalog');

    expect(await screen.findByRole('heading', { name: /catalog/i })).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation')).getByRole('link', { name: /catalog/i }),
    ).toHaveAttribute('href', '/catalog');
  });

  it('M5-31b. catalogPlaceholderMovesToCatalogRoute: a signed-out user is sent to sign in', async () => {
    const { router } = renderRoutes(routes, '/catalog');

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/login?from=%2Fcatalog');
  });
});
