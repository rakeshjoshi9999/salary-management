import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { EmployeeFields } from '../core/api.models';
import { apiUrl } from '../core/api-url';
import { employee } from '../core/testing/fixtures';
import { EmployeeService } from './employee.service';

const FIELDS: EmployeeFields = {
  fullName: 'Asha Rao',
  email: 'asha.rao@acme.example',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
  countryCode: 'IN',
  salary: 2400000,
  hireDate: '2021-04-12',
};

describe('EmployeeService', () => {
  let service: EmployeeService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmployeeService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('list sends only the parameters it was given, with a 0-based page', () => {
    service
      .list({
        q: 'asha',
        country: 'IN',
        department: undefined,
        sort: 'salary,desc',
        page: 0,
        size: undefined,
      })
      .subscribe();

    const request = controller.expectOne((r) => r.url === apiUrl('/employees'));

    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['country', 'page', 'q', 'sort']);
    expect(request.request.params.get('q')).toBe('asha');
    expect(request.request.params.get('country')).toBe('IN');
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('sort')).toBe('salary,desc');
    request.flush({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 });
  });

  it('get requests /employees/{id}', () => {
    service.get(101).subscribe();

    const request = controller.expectOne(apiUrl('/employees/101'));

    expect(request.request.method).toBe('GET');
    request.flush(employee());
  });

  it('create posts the fields with no id or currency', () => {
    service.create({ ...FIELDS, id: 7, currency: 'XXX' } as EmployeeFields).subscribe();

    const request = controller.expectOne(apiUrl('/employees'));

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(FIELDS);
    expect(request.request.body).not.toHaveProperty('id');
    expect(request.request.body).not.toHaveProperty('currency');
    request.flush(employee({ version: 0 }));
  });

  it('update puts the fields together with version', () => {
    service.update(101, { ...FIELDS, version: 3 }).subscribe();

    const request = controller.expectOne(apiUrl('/employees/101'));

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ ...FIELDS, version: 3 });
    request.flush(employee({ version: 4 }));
  });

  it('delete sends a DELETE', () => {
    let done = false;
    service.delete(101).subscribe({ complete: () => (done = true) });

    const request = controller.expectOne(apiUrl('/employees/101'));

    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBe(true);
  });
});
