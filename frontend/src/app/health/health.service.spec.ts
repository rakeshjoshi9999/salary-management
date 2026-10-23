import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { HealthService } from './health.service';

/**
 * The service owns the HTTP call so the component can stay presentational,
 * per the frontend conventions in CLAUDE.md.
 */
describe('HealthService', () => {
  let service: HealthService;
  let http: HttpTestingController;

  const healthUrl = `${environment.apiBaseUrl}/actuator/health`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HealthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks the configured API for its health', () => {
    service.check().subscribe();

    const request = http.expectOne(healthUrl);

    expect(request.request.method).toBe('GET');
    request.flush({ status: 'UP' });
  });

  it('reports reachable when the API says UP', async () => {
    const result = firstValueFrom(service.check());

    http.expectOne(healthUrl).flush({ status: 'UP' });

    expect(await result).toEqual({ reachable: true, status: 'UP' });
  });

  it('reports unreachable for any other status', async () => {
    const result = firstValueFrom(service.check());

    http.expectOne(healthUrl).flush({ status: 'DOWN' });

    expect(await result).toEqual({ reachable: false, status: 'DOWN' });
  });

  it('propagates a transport failure so the caller can say so', async () => {
    const result = firstValueFrom(service.check());

    http.expectOne(healthUrl).error(new ProgressEvent('error'), { status: 0 });

    await expect(result).rejects.toBeTruthy();
  });
});
