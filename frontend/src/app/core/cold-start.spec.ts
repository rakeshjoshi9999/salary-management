import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ColdStartTracker, coldStartInterceptor } from './cold-start';

/** ADR-004 and ADR-027: say the server is waking once any request has waited 3 s. */
describe('coldStartInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let tracker: ColdStartTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([coldStartInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    tracker = TestBed.inject(ColdStartTracker);
  });

  afterEach(() => vi.useRealTimers());

  it('marks the server as waking once a request has been pending for 3 s', () => {
    http.get('/a').subscribe();

    vi.advanceTimersByTime(2_999);
    expect(tracker.waking()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(tracker.waking()).toBe(true);
    controller.expectOne('/a').flush({});
  });

  it('does not mark it waking for a response under 3 s', () => {
    http.get('/a').subscribe();
    vi.advanceTimersByTime(2_999);

    controller.expectOne('/a').flush({});
    vi.advanceTimersByTime(3_000);

    expect(tracker.waking()).toBe(false);
  });

  it('clears waking once every slow request has finished, whether it succeeded or failed', () => {
    http.get('/a').subscribe();
    http.get('/b').subscribe({ error: () => undefined });
    const cancelled = http.get('/c').subscribe();
    vi.advanceTimersByTime(3_000);
    expect(tracker.waking()).toBe(true);

    // A fast request finishing while slow ones wait must not count against them.
    http.get('/fast').subscribe();
    controller.expectOne('/fast').flush({});
    expect(tracker.waking()).toBe(true);

    controller.expectOne('/a').flush({});
    expect(tracker.waking()).toBe(true);

    controller.expectOne('/b').flush('down', { status: 503, statusText: 'Unavailable' });
    expect(tracker.waking()).toBe(true);

    // A slow request dropped by its subscriber (switchMap, or the 90 s timeout) also ends.
    cancelled.unsubscribe();
    expect(tracker.waking()).toBe(false);
  });
});
