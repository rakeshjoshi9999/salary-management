import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error.interceptor';

/**
 * Components branch on `ApiError.code` only (ADR-018, ADR-051), so every failure, including the ones
 * the API never answered, has to arrive as an ApiError with a code.
 */
describe('apiErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  const url = '/api/v1/employees';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    vi.useRealTimers();
  });

  function failWith(body: string | object, status: number, statusText = 'Error'): ApiError {
    let caught: unknown;
    http.get(url).subscribe({ error: (e) => (caught = e) });
    controller.expectOne(url).flush(body, { status, statusText });
    expect(caught).toBeInstanceOf(ApiError);
    return caught as ApiError;
  }

  it('turns a Problem Details response into an ApiError with its code and status', () => {
    const error = failWith(
      {
        type: '/problems/duplicate-email',
        title: 'Email already used',
        status: 409,
        code: 'DUPLICATE_EMAIL',
        detail: 'Another employee has this email.',
      },
      409,
    );

    expect(error.code).toBe('DUPLICATE_EMAIL');
    expect(error.status).toBe(409);
    expect(error.message).toBe('Another employee has this email.');
  });

  it('maps VALIDATION_FAILED errors into field errors, keyed by field name', () => {
    const error = failWith(
      {
        type: '/problems/validation-failed',
        title: 'Invalid request',
        status: 400,
        code: 'VALIDATION_FAILED',
        errors: [
          { field: 'salary', message: 'must be greater than 0' },
          { field: 'email', message: 'must be a valid email address' },
        ],
      },
      400,
    );

    expect(error.fieldErrors).toEqual({
      salary: 'must be greater than 0',
      email: 'must be a valid email address',
    });
  });

  it('carries currentVersion for STALE_VERSION', () => {
    const error = failWith(
      {
        type: '/problems/stale-version',
        title: 'Stale',
        status: 409,
        code: 'STALE_VERSION',
        currentVersion: 4,
      },
      409,
    );

    expect(error.code).toBe('STALE_VERSION');
    expect(error.currentVersion).toBe(4);
  });

  it('carries errorId for INTERNAL_ERROR', () => {
    const error = failWith(
      {
        type: '/problems/internal-error',
        title: 'Oops',
        status: 500,
        code: 'INTERNAL_ERROR',
        errorId: 'e-123',
      },
      500,
    );

    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.errorId).toBe('e-123');
  });

  it('turns a request that got no response into NETWORK_ERROR', () => {
    let caught: unknown;
    http.get(url).subscribe({ error: (e) => (caught = e) });

    controller.expectOne(url).error(new ProgressEvent('error'), { status: 0 });

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('NETWORK_ERROR');
  });

  it('gives a non-Problem error body a code by its status family', () => {
    const gateway = failWith('<html>Bad gateway</html>', 502, 'Bad Gateway');
    const client = failWith('nope', 418, 'Teapot');

    expect(gateway.code).toBe('INTERNAL_ERROR');
    expect(gateway.status).toBe(502);
    expect(client.code).toBe('MALFORMED_REQUEST');
  });

  it('fails a request with TIMEOUT after 90 s with no answer', () => {
    vi.useFakeTimers();
    let caught: unknown;
    http.get(url).subscribe({ error: (e) => (caught = e) });
    const pending = controller.expectOne(url);

    vi.advanceTimersByTime(89_999);
    expect(caught).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('TIMEOUT');
    expect(pending.cancelled).toBe(true);
  });
});
