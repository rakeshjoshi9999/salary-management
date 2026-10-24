import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { HealthPage } from './health-page';

/**
 * Every data view handles loading, empty and error states (CLAUDE.md). Here
 * "empty" has no meaning - a health check is reachable or it is not - so the
 * three states are pending, reachable and unreachable.
 *
 * The pending state carries the cold-start message rather than a bare spinner,
 * because ADR-004 accepted a ~50s wake on the free tier and committed to saying
 * so in plain words. It is shown immediately, not after a timer, so this needs
 * no fake clock.
 */
describe('HealthPage', () => {
  let fixture: ComponentFixture<HealthPage>;
  let http: HttpTestingController;

  const healthUrl = `${environment.apiBaseUrl}/actuator/health`;

  const query = (testId: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HealthPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(HealthPage);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('says it may be waking the server while waiting', () => {
    http.expectOne(healthUrl);

    const pending = query('health-pending');

    expect(pending).toBeTruthy();
    expect(pending?.textContent?.toLowerCase()).toContain('waking');
  });

  it('shows the API as reachable when health is UP', async () => {
    http.expectOne(healthUrl).flush({ status: 'UP' });
    await fixture.whenStable();

    expect(query('health-reachable')).toBeTruthy();
    expect(query('health-pending')).toBeNull();
    expect(query('health-unreachable')).toBeNull();
  });

  it('shows an error state when the API cannot be reached', async () => {
    http.expectOne(healthUrl).error(new ProgressEvent('error'), { status: 0 });
    await fixture.whenStable();

    expect(query('health-unreachable')).toBeTruthy();
    expect(query('health-reachable')).toBeNull();
  });

  it('offers a retry that asks the API again', async () => {
    http.expectOne(healthUrl).error(new ProgressEvent('error'), { status: 0 });
    await fixture.whenStable();

    const retry = query('health-retry') as HTMLButtonElement | null;
    expect(retry).toBeTruthy();

    retry?.click();
    await fixture.whenStable();

    // A second request proves the retry re-asks rather than only clearing the message.
    http.expectOne(healthUrl).flush({ status: 'UP' });
    await fixture.whenStable();

    expect(query('health-reachable')).toBeTruthy();
  });

  it('shows which API it is talking to', async () => {
    http.expectOne(healthUrl).flush({ status: 'UP' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(environment.apiBaseUrl);
  });

  it('shows which environment it is running in', async () => {
    http.expectOne(healthUrl).flush({ status: 'UP' });
    await fixture.whenStable();

    // Exact match: 'local' is also a substring of the local API URL.
    expect(query('health-environment')?.textContent?.trim()).toBe(environment.name);
  });
});
