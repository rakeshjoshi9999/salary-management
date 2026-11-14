import { HttpResponse } from 'msw';

/** An RFC 9457 Problem Details response, the shape every server error has (ADR-M2). */
export function problem(status: number, code: string, detail = `${code} (test)`) {
  return HttpResponse.json(
    { type: 'about:blank', title: code, status, detail, instance: '/test', code },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}
