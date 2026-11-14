import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from '../../app/routes';
import { getAccessToken } from '../../lib/token';
import { meAs, session } from '../../test/auth';
import { problem } from '../../test/problem';
import { currentUrl, renderRoutes } from '../../test/render';
import { server } from '../../test/server';

/** Sign-up with React Hook Form + Zod (ADR-M4), then an automatic login (decision M4-8). */
describe('RegisterPage', () => {
  let registerCalls = 0;

  beforeEach(() => {
    registerCalls = 0;
    server.use(
      http.post('/api/auth/register', () => {
        registerCalls += 1;
        return HttpResponse.json(
          { id: 'u2', email: 'new@example.com', role: 'VIEWER' },
          { status: 201 },
        );
      }),
      meAs('VIEWER'),
    );
  });

  async function register(email: string, password: string) {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/email/i), email);
    await user.type(screen.getByLabelText(/password/i), password);
    await user.click(screen.getByRole('button', { name: /create account/i }));
  }

  it('M4-22. validatesEmailAndPasswordLength: a bad email and a short password are explained, nothing is sent', async () => {
    renderRoutes(routes, '/register');

    await register('not-an-email', 'short');

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(registerCalls).toBe(0);
  });

  it('M4-23. showsEmailTakenOnTheEmailField: the server error appears under the email field', async () => {
    server.use(http.post('/api/auth/register', () => problem(409, 'EMAIL_TAKEN')));
    renderRoutes(routes, '/register');

    await register('ana@example.com', 'correct horse');

    const email = screen.getByLabelText(/email/i);
    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
    expect(email).toHaveAccessibleDescription(/already registered/i);
  });

  it('M4-24. signsInAutomaticallyAfterRegister: a new account lands on the home page, signed in', async () => {
    const logins: unknown[] = [];
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        logins.push(await request.json());
        return session('t1');
      }),
    );
    const { router } = renderRoutes(routes, '/register');

    await register('new@example.com', 'correct horse');

    expect(await screen.findByRole('heading', { name: /catalog/i })).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/');
    // A real login, not a client that just believes the 201: the session must survive the next request.
    expect(logins).toEqual([{ email: 'new@example.com', password: 'correct horse' }]);
    expect(getAccessToken()).toBe('t1');
  });

  it('M4-25. fallsBackToLoginWhenAutoLoginFails: the account exists, so the login page says so', async () => {
    server.use(http.post('/api/auth/login', () => problem(500, 'INTERNAL_ERROR')));
    const { router } = renderRoutes(routes, '/register');

    await register('new@example.com', 'correct horse');

    expect(await screen.findByText(/account created/i)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });
});
