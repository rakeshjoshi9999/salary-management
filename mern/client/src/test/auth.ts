import { http, HttpResponse } from 'msw';

export type Role = 'HR_MANAGER' | 'VIEWER';

/** The body `/auth/login` and `/auth/refresh` answer with (ADR-M3). */
export function session(accessToken = 't1') {
  return HttpResponse.json({ accessToken, tokenType: 'Bearer', expiresIn: 900 });
}

/** `/auth/me` for a signed-in user, answering only to the bearer `token`. */
export function meAs(role: Role, token = 't1') {
  return http.get('/api/auth/me', ({ request }) =>
    request.headers.get('Authorization') === `Bearer ${token}`
      ? HttpResponse.json({ id: 'u1', role })
      : HttpResponse.json({ code: 'UNAUTHENTICATED' }, { status: 401 }),
  );
}

/** A browser that still holds a valid refresh cookie: the session restores as `role`. */
export function signedInAs(role: Role) {
  return [http.post('/api/auth/refresh', () => session('t1')), meAs(role)];
}
