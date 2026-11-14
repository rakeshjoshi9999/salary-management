/**
 * Where to go after signing in: only a page on this site, or the login page becomes an open redirect.
 * The value is parsed, not pattern-matched: browsers read `\` as `/` and strip tabs and newlines while
 * parsing, so strings like `/\evil.example` or `/<tab>/evil.example` resolve to another site.
 */
export function safeFrom(from: string | null): string {
  if (!from || !from.startsWith('/')) {
    return '/';
  }
  const url = new URL(from, window.location.origin);
  if (url.origin !== window.location.origin) {
    return '/';
  }
  return url.pathname + url.search + url.hash;
}
