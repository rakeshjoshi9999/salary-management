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

export async function api<T>(_path: string, _init?: RequestInit): Promise<T> {
  throw new Error('not implemented');
}
