import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { apiUrl } from '../core/api-url';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  it('gets the settings, and puts defaultCountryCode with version', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const controller = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(SettingsService);
    let loaded: unknown;
    let saved: unknown;

    service.get().subscribe((s) => (loaded = s));
    const get = controller.expectOne(apiUrl('/settings'));
    expect(get.request.method).toBe('GET');
    get.flush({ defaultCountryCode: 'IN', version: 0 });

    service.update({ defaultCountryCode: 'DE', version: 0 }).subscribe((s) => (saved = s));
    const put = controller.expectOne(apiUrl('/settings'));
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ defaultCountryCode: 'DE', version: 0 });
    put.flush({ defaultCountryCode: 'DE', version: 1 });

    expect(loaded).toEqual({ defaultCountryCode: 'IN', version: 0 });
    expect(saved).toEqual({ defaultCountryCode: 'DE', version: 1 });
    controller.verify();
  });
});
