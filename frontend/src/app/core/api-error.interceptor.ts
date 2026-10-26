import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout } from 'rxjs';

import { ApiError, toApiError } from './api-error';

/** How long a request may wait before it fails with TIMEOUT (ADR-027, ADR-051). */
export const REQUEST_TIMEOUT_MS = 90_000;

/** Turns every failure into an ApiError, including requests that never got an answer. */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    // `each`, not `first`: HttpClient emits a "sent" event straight away, before any answer.
    timeout({
      each: REQUEST_TIMEOUT_MS,
      with: () =>
        throwError(() => new ApiError('TIMEOUT', 0, 'The server took too long to answer.')),
    }),
    catchError((error: unknown) =>
      throwError(() => (error instanceof HttpErrorResponse ? toApiError(error) : error)),
    ),
  );
