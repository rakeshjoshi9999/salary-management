import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { apiUrl } from './api-url';
import { ReferenceStore } from './reference.store';
import { REFERENCE } from './testing/fixtures';

describe('ReferenceStore', () => {
  let store: ReferenceStore;
  let controller: HttpTestingController;

  const url = apiUrl('/reference');

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ReferenceStore);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('loads the reference data once and reports ready; a second consumer does not refetch it', () => {
    store.load();
    expect(store.status()).toBe('loading');
    store.load();

    controller.expectOne(url).flush(REFERENCE);
    store.load();

    expect(store.ready()).toBe(true);
    expect(store.countries()).toEqual(REFERENCE.countries);
    expect(store.departments()).toEqual(REFERENCE.departments);
    controller.expectNone(url);
  });

  it('reports an error, and Retry fetches again', () => {
    store.load();
    controller.expectOne(url).flush('down', { status: 503, statusText: 'Unavailable' });
    expect(store.status()).toBe('error');

    store.retry();
    controller.expectOne(url).flush(REFERENCE);

    expect(store.ready()).toBe(true);
  });

  it('gives a department its titles, or every title when no department is chosen', () => {
    store.load();
    controller.expectOne(url).flush(REFERENCE);

    expect(store.titlesFor('Sales')).toEqual(['Account Executive']);
    expect(store.titlesFor(null)).toEqual([
      'Account Executive',
      'QA Engineer',
      'Software Engineer',
    ]);
    expect(store.titlesFor('Nonsense')).toEqual([]);
  });

  it('gives a country its currency and name', () => {
    store.load();
    controller.expectOne(url).flush(REFERENCE);

    expect(store.country('IN')).toEqual({ code: 'IN', name: 'India', currency: 'INR' });
    expect(store.country('XX')).toBeUndefined();
  });
});
