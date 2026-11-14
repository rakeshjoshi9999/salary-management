import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from '../../app/routes';
import { meAs, session, signedInAs } from '../../test/auth';
import { problem } from '../../test/problem';
import { currentUrl, renderRoutes } from '../../test/render';
import { server } from '../../test/server';

/** The login form, built by hand with controlled inputs (decision 7 of ADR-M4). */
describe('LoginPage', () => {
  let loginBodies: unknown[] = [];

  /** `/auth/login` accepting only ana's password, recording what was sent. */
  beforeEach(() => {
    loginBodies = [];
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string };
        loginBodies.push(body);
        return body.email === 'ana@example.com' && body.password === 'correct horse'
          ? session('t1')
          : problem(401, 'INVALID_CREDENTIALS');
      }),
      meAs('VIEWER'),
      http.get('/api/health', () => HttpResponse.json({ status: 'UP' })),
    );
  });

  async function signIn(email: string, password: string) {
    const user = userEvent.setup();
    if (email) await user.type(await screen.findByLabelText(/email/i), email);
    if (password) await user.type(screen.getByLabelText(/password/i), password);
    await user.click(await screen.findByRole('button', { name: /sign in/i }));
  }

  it('M4-16. signsInAndReturnsToFrom: after signing in the user lands where they were going', async () => {
    const { router } = renderRoutes(routes, '/login?from=%2Fhealth');

    await signIn('ana@example.com', 'correct horse');

    expect(await screen.findByRole('heading', { name: /server health/i })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/health');
  });

  it.each(['//evil.example', 'https://evil.example/', '/\\evil.example'])(
    'M4-17. ignoresUnsafeFrom: from=%s lands on the home page, never off the site',
    async (from) => {
      const { router } = renderRoutes(routes, `/login?from=${encodeURIComponent(from)}`);

      await signIn('ana@example.com', 'correct horse');

      expect(await screen.findByRole('heading', { name: /catalog/i })).toBeInTheDocument();
      expect(currentUrl(router)).toBe('/');
    },
  );

  it('M4-18. showsGenericMessageOnInvalidCredentials: one message for any wrong email or password', async () => {
    renderRoutes(routes, '/login');

    await signIn('ana@example.com', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(/email or password is incorrect/i);
    expect(screen.getByLabelText(/email/i)).toHaveValue('ana@example.com');
  });

  it('M4-19. requiresEmailAndPasswordBeforeSending: empty fields are explained, nothing is sent', async () => {
    renderRoutes(routes, '/login');

    await signIn('', '');

    expect(await screen.findByText(/enter your email/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
    expect(loginBodies).toEqual([]);
  });

  it('M4-20. explainsAnExpiredSession: arriving with reason=expired says why', async () => {
    renderRoutes(routes, '/login?reason=expired');

    expect(await screen.findByText(/your session has expired/i)).toBeInTheDocument();
  });

  it('M4-21. redirectsSignedInUserAwayFromLogin: a signed-in user never sees the login form', async () => {
    server.use(...signedInAs('VIEWER'));

    const { router } = renderRoutes(routes, '/login');

    expect(await screen.findByRole('heading', { name: /catalog/i })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/');
  });
});
