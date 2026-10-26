import { apiErrorInterceptor } from './api-error.interceptor';
import { coldStartInterceptor } from './cold-start';

/**
 * Every request goes through these, in this order: cold-start detection wraps the whole request,
 * including the error mapping and its 90 s timeout (ADR-051). Used by app.config.ts and by
 * provideShellTesting(), so the tests run the same chain as the app.
 */
export const API_INTERCEPTORS = [coldStartInterceptor, apiErrorInterceptor];
