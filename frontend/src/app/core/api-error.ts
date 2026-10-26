import { HttpErrorResponse } from '@angular/common/http';

/** Codes the UI can branch on (ADR-018, ADR-051). The API's codes plus two of the client's own. */
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

/** Every failed request reaches a component as one of these. */
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

export function toApiError(_response: HttpErrorResponse): ApiError {
  return new ApiError('INTERNAL_ERROR', 0, 'not implemented');
}
