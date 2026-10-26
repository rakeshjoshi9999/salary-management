import { HttpErrorResponse } from '@angular/common/http';

import { Problem } from './api.models';

/** Codes the UI can branch on (ADR-018, ADR-051): the API's codes plus two of the client's own. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'MALFORMED_REQUEST'
  | 'EMPLOYEE_NOT_FOUND'
  | 'COUNTRY_NOT_FOUND'
  | 'NOT_FOUND'
  | 'DUPLICATE_EMAIL'
  | 'STALE_VERSION'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | (string & {});

/** Every failed request reaches a component as one of these. Components branch on `code` only. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly fieldErrors: Readonly<Record<string, string>> = {},
    readonly currentVersion?: number,
    readonly errorId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isProblem(body: unknown): body is Problem {
  return typeof body === 'object' && body !== null && typeof (body as Problem).code === 'string';
}

export function toApiError(response: HttpErrorResponse): ApiError {
  if (response.status === 0) {
    return new ApiError('NETWORK_ERROR', 0, 'The server could not be reached.');
  }
  const body: unknown = response.error;
  if (isProblem(body)) {
    const fieldErrors: Record<string, string> = {};
    for (const { field, message } of body.errors ?? []) {
      // The first message for a field is the one shown.
      fieldErrors[field] ??= message;
    }
    return new ApiError(
      body.code,
      response.status,
      body.detail ?? body.title,
      fieldErrors,
      body.currentVersion,
      body.errorId,
    );
  }
  // Not a Problem: a proxy or gateway page, such as Render's 502 while the service restarts.
  const code = response.status >= 500 ? 'INTERNAL_ERROR' : 'MALFORMED_REQUEST';
  return new ApiError(code, response.status, response.message);
}
