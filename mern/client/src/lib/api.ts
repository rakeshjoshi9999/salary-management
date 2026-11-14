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

/**
 * `fetch` with the app's rules: the `/api` prefix, same-origin cookies, and one error type. `fetch` only
 * rejects when the network fails; a 404 or a 500 resolves, so every non-2xx is turned into an ApiError here.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json, application/problem+json');
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
  return (await response.json()) as T;
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
