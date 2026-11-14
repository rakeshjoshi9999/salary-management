import { emitSessionExpired } from './session';
import { getAccessToken, setAccessToken } from './token';

/** Every request goes to the page's own origin under `/api`; the Vite proxy (dev) or Vercel forwards it. */
export const API_BASE = '/api';

/** A failed request, whatever went wrong. Callers branch on `code`, never on `detail` (ADR-M2). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

/** The credential endpoints: a 401 there is an answer about credentials, never a reason to refresh. */
const NO_REFRESH = new Set(['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']);

/**
 * `fetch` with the app's rules: the `/api` prefix, same-origin cookies, the bearer token, and one error
 * type. On a 401 `TOKEN_EXPIRED` it refreshes once (shared by every caller) and replays the request once:
 * the React twin of an Angular `HttpInterceptor` with `catchError` → refresh → retry.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await send<T>(path, init);
  } catch (error) {
    const expired = error instanceof ApiError && error.code === 'TOKEN_EXPIRED';
    if (!expired || NO_REFRESH.has(path)) {
      throw error;
    }
  }

  try {
    await refreshAccessToken();
  } catch (refreshError) {
    // The refresh cookie was refused: the session is over. A network failure is not, so it only fails.
    // Every caller awaiting the shared refresh lands here; the first clears the token and announces it.
    if (
      refreshError instanceof ApiError &&
      refreshError.status === 401 &&
      getAccessToken() !== null
    ) {
      setAccessToken(null);
      emitSessionExpired();
    }
    throw refreshError;
  }
  // Exactly one replay. If it is refused again, the refresh still proved the session alive: fail this
  // request only, and keep the user signed in.
  return send<T>(path, init);
}

/** One request, no retries. `fetch` rejects only when the network fails; every non-2xx becomes an ApiError. */
async function send<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, application/problem+json');
  }
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  try {
    return (await response.json()) as T;
  } catch {
    // Typically index.html served where the API should be (a missing proxy or rewrite).
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'The server answer was not JSON.');
  }
}

/** Reads a Problem Details body when there is one; any other error body keeps only the status. */
async function toApiError(response: Response): Promise<ApiError> {
  const fallback = new ApiError(
    response.status,
    'HTTP_ERROR',
    `The server answered ${response.status} ${response.statusText}`.trim() + '.',
  );
  if (!response.headers.get('Content-Type')?.includes('application/problem+json')) {
    return fallback;
  }
  try {
    const problem = (await response.json()) as { code?: unknown; detail?: unknown };
    if (typeof problem.code === 'string' && typeof problem.detail === 'string') {
      return new ApiError(response.status, problem.code, problem.detail);
    }
  } catch {
    // A body that claims to be Problem Details but is not JSON: the status is all there is.
  }
  return fallback;
}

let inFlight: Promise<string> | null = null;

/**
 * Exchanges the refresh cookie for a new access token. Single-flight: every caller during a refresh
 * awaits the same promise (one tab). The Web Lock serializes refreshes across tabs, so a tab that waited
 * sends the cookie the previous refresh just rotated. Without either, reuse detection would log out.
 */
export function refreshAccessToken(): Promise<string> {
  inFlight ??= withRefreshLock(async () => {
    const { accessToken } = await send<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
    });
    setAccessToken(accessToken);
    return accessToken;
  }).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Runs `work` holding the `auth-refresh` lock when the browser has Web Locks, else directly. */
function withRefreshLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator && navigator.locks) {
    return navigator.locks.request('auth-refresh', work);
  }
  return work();
}

/** Settles once no refresh is in flight. Logout waits on it, so a late refresh cannot restore a token. */
export async function settledRefresh(): Promise<void> {
  await inFlight?.catch(() => undefined);
}
