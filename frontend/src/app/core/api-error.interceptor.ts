import { HttpInterceptorFn } from '@angular/common/http';

/** How long a request may wait before it fails with TIMEOUT (ADR-027, ADR-051). */
export const REQUEST_TIMEOUT_MS = 90_000;

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => next(request);
