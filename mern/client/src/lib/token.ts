/**
 * The access token, in memory only (ADR-M3): never `localStorage`, which any injected script can read.
 * A module, not React state, because the fetch wrapper is a plain function and cannot call hooks.
 * `AuthProvider` is its only writer besides the wrapper's refresh.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
