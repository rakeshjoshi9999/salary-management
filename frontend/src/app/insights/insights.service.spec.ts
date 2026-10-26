import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { apiUrl } from '../core/api-url';
import { InsightsService } from './insights.service';

describe('InsightsService', () => {
  it('requests /insights/countries/{code}', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const controller = TestBed.inject(HttpTestingController);
    let received: unknown;

    TestBed.inject(InsightsService)
      .forCountry('IN')
      .subscribe((r) => (received = r));

    const request = controller.expectOne(apiUrl('/insights/countries/IN'));
    expect(request.request.method).toBe('GET');
    const body = {
      countryCode: 'IN',
      currency: 'INR',
      salary: { headcount: 0, min: null, max: null, average: null, median: null },
      averageByJobTitle: [],
      headcountByDepartment: [],
    };
    request.flush(body);
    expect(received).toEqual(body);
    controller.verify();
  });
});
