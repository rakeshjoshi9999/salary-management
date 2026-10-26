import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';

import { API_INTERCEPTORS } from '../core/api-interceptors';
import { apiUrl } from '../core/api-url';
import { CLOCK } from '../core/clock';
import { REFERENCE, employee } from '../core/testing/fixtures';
import { CatalogRefresh } from './catalog-refresh';
import { drawerRoutes } from './catalog.routes';

@Component({
  imports: [RouterOutlet],
  template: '<p>list</p><router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubList {}

const ASHA = employee();
// 23:30 UTC: already the 27th east of UTC, so a local-date implementation fails.
const NOW = new Date('2026-10-26T23:30:00Z');

/** UI_DESIGN.md Employee drawer, and ADR-051 for the 409 and unsaved-changes behaviour. */
describe('EmployeeDrawer', () => {
  let harness: RouterTestingHarness;
  let controller: HttpTestingController;
  let router: Router;

  const q = (testId: string) => document.querySelector(`[data-testid="${testId}"]`);
  const field = (name: string) => q(`field-${name}`) as HTMLInputElement | HTMLSelectElement;
  const errorFor = (name: string) => q(`error-${name}`)?.textContent?.trim() ?? '';

  async function open(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'catalog', component: StubList, children: drawerRoutes }]),
        provideHttpClient(withInterceptors(API_INTERCEPTORS)),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: CLOCK, useValue: () => NOW },
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    controller.expectOne(apiUrl('/reference')).flush(REFERENCE);
    await settle();
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
  }

  function getRequest(id = 101): TestRequest {
    return controller.expectOne((r) => r.method === 'GET' && r.url === apiUrl(`/employees/${id}`));
  }

  async function openEdit(): Promise<void> {
    await open('/catalog/101/edit');
    getRequest().flush(ASHA);
    await settle();
  }

  function type(name: string, value: string): void {
    const el = field(name) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
  }

  function choose(name: string, value: string): void {
    const el = field(name) as HTMLSelectElement;
    el.value = value;
    el.dispatchEvent(new Event('change'));
  }

  async function save(): Promise<void> {
    (q('save') as HTMLButtonElement).click();
    await settle();
  }

  async function fillValidNewEmployee(): Promise<void> {
    type('fullName', '  Chen Wei  ');
    type('email', ' chen.wei@acme.example ');
    choose('department', 'Engineering');
    // The department's titles render first; only then can one be chosen.
    await settle();
    choose('jobTitle', 'QA Engineer');
    choose('countryCode', 'DE');
    type('salary', '65000.50');
    type('hireDate', '2024-02-01');
  }

  afterEach(() => {
    controller.verify();
    vi.restoreAllMocks();
  });

  // View

  it('loads the employee by id and shows the details', async () => {
    await open('/catalog/101');
    getRequest().flush(ASHA);
    await settle();

    const details = q('employee-details')?.textContent ?? '';
    for (const value of [
      'Asha Rao',
      'asha.rao@acme.example',
      'Software Engineer',
      'Engineering · India',
      'INR 2,400,000.00',
      '2021-04-12',
    ]) {
      expect(details).toContain(value);
    }
  });

  it('a 404 shows "This employee no longer exists" with Close', async () => {
    await open('/catalog/999?country=IN');
    getRequest(999).flush(
      {
        type: '/problems/employee-not-found',
        title: 'Not found',
        status: 404,
        code: 'EMPLOYEE_NOT_FOUND',
      },
      { status: 404, statusText: 'Not Found' },
    );
    await settle();

    expect(q('not-found')?.textContent).toContain('This employee no longer exists');

    (q('not-found-close') as HTMLButtonElement).click();
    await settle();
    expect(router.url).toBe('/catalog?country=IN');
  });

  it('Close returns to the Catalog with the list query kept', async () => {
    await open('/catalog/101?country=IN&page=2');
    getRequest().flush(ASHA);
    await settle();

    (q('drawer-close') as HTMLButtonElement).click();
    await settle();

    expect(router.url).toBe('/catalog?country=IN&page=2');
  });

  // Form

  it('the add form at /catalog/new starts empty', async () => {
    await open('/catalog/new');

    for (const name of [
      'fullName',
      'email',
      'department',
      'jobTitle',
      'countryCode',
      'salary',
      'hireDate',
    ]) {
      expect(field(name).value).toBe('');
    }
    controller.expectNone((r) => r.url.startsWith(apiUrl('/employees')));
  });

  it('the edit form is filled in from the employee', async () => {
    await openEdit();

    expect(field('fullName').value).toBe('Asha Rao');
    expect(field('email').value).toBe('asha.rao@acme.example');
    expect(field('department').value).toBe('Engineering');
    expect(field('jobTitle').value).toBe('Software Engineer');
    expect(field('countryCode').value).toBe('IN');
    expect(field('salary').value).toBe('2400000');
    expect(field('hireDate').value).toBe('2021-04-12');
  });

  it('every field is required', async () => {
    await open('/catalog/new');

    await save();

    for (const name of ['fullName', 'email', 'department', 'countryCode', 'salary', 'hireDate']) {
      expect(errorFor(name)).not.toBe('');
    }
    // The title is disabled until a department is picked, and required from then on.
    choose('department', 'Sales');
    await save();
    expect(errorFor('jobTitle')).not.toBe('');
    controller.expectNone((r) => r.method === 'POST');
  });

  it('rejects an invalid email, including one with no dot in its domain', async () => {
    await open('/catalog/new');

    for (const bad of ['not-an-email', 'a@b', 'a@b.', 'a b@c.example']) {
      type('email', bad);
      await settle();
      expect(errorFor('email')).not.toBe('');
    }
    type('email', 'a@b.example');
    await settle();
    expect(errorFor('email')).toBe('');
  });

  it('rejects a salary of 0 or less', async () => {
    await open('/catalog/new');

    for (const bad of ['0', '-5', '0.00']) {
      type('salary', bad);
      await settle();
      expect(errorFor('salary')).not.toBe('');
    }
    type('salary', '0.01');
    await settle();
    expect(errorFor('salary')).toBe('');
  });

  it('rejects a salary with more than 2 decimals', async () => {
    await open('/catalog/new');

    type('salary', '100.123');
    await settle();
    expect(errorFor('salary')).not.toBe('');

    type('salary', '100.12');
    await settle();
    expect(errorFor('salary')).toBe('');
  });

  it('rejects a hire date before 1950-01-01 or after today in UTC; the picker limits the dates', async () => {
    await open('/catalog/new');

    expect(field('hireDate').getAttribute('min')).toBe('1950-01-01');
    expect(field('hireDate').getAttribute('max')).toBe('2026-10-26');

    for (const bad of ['1949-12-31', '2026-10-27']) {
      type('hireDate', bad);
      await settle();
      expect(errorFor('hireDate')).not.toBe('');
    }
    for (const good of ['1950-01-01', '2026-10-26']) {
      type('hireDate', good);
      await settle();
      expect(errorFor('hireDate')).toBe('');
    }
  });

  it('enforces the length limits: name 200, email 254', async () => {
    await open('/catalog/new');

    // 64-character local part and labels of at most 63, so only the total length is wrong.
    const email254 = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(53)}.example`;
    const email255 = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(54)}.example`;
    expect(email254.length).toBe(254);

    type('fullName', 'a'.repeat(201));
    type('email', email255);
    await settle();
    expect(errorFor('fullName')).not.toBe('');
    expect(errorFor('email')).not.toBe('');

    type('fullName', 'a'.repeat(200));
    type('email', email254);
    await settle();
    expect(errorFor('fullName')).toBe('');
    expect(errorFor('email')).toBe('');
  });

  it('the title is disabled until a department is picked, then lists only its titles', async () => {
    await open('/catalog/new');
    expect(field('jobTitle').disabled).toBe(true);

    choose('department', 'Sales');
    await settle();

    expect(field('jobTitle').disabled).toBe(false);
    const options = Array.from((field('jobTitle') as HTMLSelectElement).options)
      .map((o) => o.value)
      .filter((v) => v !== '');
    expect(options).toEqual(['Account Executive']);
  });

  it('changing the department clears the title', async () => {
    await openEdit();
    expect(field('jobTitle').value).toBe('Software Engineer');

    choose('department', 'Sales');
    await settle();

    expect(field('jobTitle').value).toBe('');
  });

  it('the currency label follows the selected country', async () => {
    await open('/catalog/new');
    expect(q('salary-currency')?.textContent?.trim()).toBe('');

    choose('countryCode', 'DE');
    await settle();
    expect(q('salary-currency')?.textContent?.trim()).toBe('EUR');

    choose('countryCode', 'IN');
    await settle();
    expect(q('salary-currency')?.textContent?.trim()).toBe('INR');
  });

  it('Save on add posts the trimmed values and opens the new employee', async () => {
    const toast = vi.spyOn(MessageService.prototype, 'add');
    const refresh = vi.spyOn(CatalogRefresh.prototype, 'request');
    await open('/catalog/new?country=DE');
    await fillValidNewEmployee();
    await settle();

    await save();

    const post = controller.expectOne((r) => r.method === 'POST' && r.url === apiUrl('/employees'));
    expect(post.request.body).toEqual({
      fullName: 'Chen Wei',
      email: 'chen.wei@acme.example',
      jobTitle: 'QA Engineer',
      department: 'Engineering',
      countryCode: 'DE',
      salary: 65000.5,
      hireDate: '2024-02-01',
    });
    post.flush(employee({ id: 555, fullName: 'Chen Wei', version: 0 }));
    await settle();

    expect(router.url).toBe('/catalog/555?country=DE');
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Saved' }),
    );
    expect(refresh).toHaveBeenCalled();
    getRequest(555).flush(employee({ id: 555, fullName: 'Chen Wei', version: 0 }));
  });

  it('Save on edit puts the values with version, shows the view with "Saved", and refreshes the list', async () => {
    const toast = vi.spyOn(MessageService.prototype, 'add');
    const refresh = vi.spyOn(CatalogRefresh.prototype, 'request');
    await open('/catalog/101/edit?country=IN');
    getRequest().flush(ASHA);
    await settle();
    type('salary', '2500000');
    await settle();

    await save();

    const put = controller.expectOne((r) => r.method === 'PUT');
    expect(put.request.url).toBe(apiUrl('/employees/101'));
    expect(put.request.body).toMatchObject({ salary: 2500000, version: 3, fullName: 'Asha Rao' });
    put.flush(employee({ salary: 2500000, version: 4 }));
    await settle();

    expect(router.url).toBe('/catalog/101?country=IN');
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Saved' }),
    );
    expect(refresh).toHaveBeenCalled();
    getRequest().flush(employee({ salary: 2500000, version: 4 }));
  });

  it('while saving, the inputs are locked and Save shows a spinner', async () => {
    await openEdit();
    type('salary', '2500000');
    await settle();

    await save();

    expect(field('fullName').disabled).toBe(true);
    expect(field('salary').disabled).toBe(true);
    expect(q('save')?.getAttribute('aria-busy')).toBe('true');
    controller.expectOne((r) => r.method === 'PUT');
  });

  it('VALIDATION_FAILED errors show on the matching fields', async () => {
    await openEdit();
    type('salary', '2500000');
    await settle();
    await save();

    controller
      .expectOne((r) => r.method === 'PUT')
      .flush(
        {
          type: '/problems/validation-failed',
          title: 'Invalid request',
          status: 400,
          code: 'VALIDATION_FAILED',
          errors: [
            { field: 'jobTitle', message: 'must belong to the department' },
            { field: 'email', message: 'must be a valid email address' },
          ],
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(errorFor('jobTitle')).toContain('must belong to the department');
    expect(errorFor('email')).toContain('must be a valid email address');
    expect(field('salary').value).toBe('2500000');
  });

  it('DUPLICATE_EMAIL shows on the email field', async () => {
    await open('/catalog/new');
    await fillValidNewEmployee();
    await settle();
    await save();

    controller
      .expectOne((r) => r.method === 'POST')
      .flush(
        {
          type: '/problems/duplicate-email',
          title: 'Duplicate',
          status: 409,
          code: 'DUPLICATE_EMAIL',
        },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    expect(errorFor('email')).toContain('already');
    expect(field('fullName').value).toBe('  Chen Wei  ');
  });

  it('STALE_VERSION shows the banner, keeps the edits and disables Save', async () => {
    await openEdit();
    type('salary', '2500000');
    await settle();
    await save();

    controller
      .expectOne((r) => r.method === 'PUT')
      .flush(
        {
          type: '/problems/stale-version',
          title: 'Stale',
          status: 409,
          code: 'STALE_VERSION',
          currentVersion: 4,
        },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    expect(q('stale-banner')?.textContent).toContain('changed by someone else');
    expect(field('salary').value).toBe('2500000');
    expect(field('salary').disabled).toBe(false);
    expect((q('save') as HTMLButtonElement).disabled).toBe(true);

    type('salary', '2550000');
    await settle();
    expect((q('save') as HTMLButtonElement).disabled).toBe(true);
    (q('save') as HTMLButtonElement).click();
    await settle();
    controller.expectNone((r) => r.method === 'PUT');
  });

  it('Reload latest refetches the employee and reopens the form on the fresh data', async () => {
    await openEdit();
    type('salary', '2500000');
    await settle();
    await save();
    controller
      .expectOne((r) => r.method === 'PUT')
      .flush(
        {
          type: '/problems/stale-version',
          title: 'Stale',
          status: 409,
          code: 'STALE_VERSION',
          currentVersion: 4,
        },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    (q('reload-latest') as HTMLButtonElement).click();
    await settle();
    getRequest().flush(employee({ fullName: 'Asha R. Rao', salary: 2450000, version: 4 }));
    await settle();

    expect(q('stale-banner')).toBeNull();
    expect(field('fullName').value).toBe('Asha R. Rao');
    expect(field('salary').value).toBe('2450000');

    type('salary', '2600000');
    await settle();
    await save();
    expect(controller.expectOne((r) => r.method === 'PUT').request.body).toMatchObject({
      version: 4,
    });
  });

  it('any other error shows a toast and keeps the edits', async () => {
    const toast = vi.spyOn(MessageService.prototype, 'add');
    await openEdit();
    type('salary', '2500000');
    await settle();
    await save();

    controller
      .expectOne((r) => r.method === 'PUT')
      .flush('boom', { status: 500, statusText: 'Server Error' });
    await settle();

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    expect(field('salary').value).toBe('2500000');
    expect(field('salary').disabled).toBe(false);
    expect((q('save') as HTMLButtonElement).disabled).toBe(false);

    // A validation error on no field in the form must not vanish silently.
    toast.mockClear();
    await save();
    controller
      .expectOne((r) => r.method === 'PUT')
      .flush(
        {
          type: '/problems/validation-failed',
          title: 'Invalid request',
          status: 400,
          code: 'VALIDATION_FAILED',
          errors: [{ field: 'version', message: 'must not be null' }],
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });

  it('a 404 on save shows "This employee no longer exists"', async () => {
    await openEdit();
    type('salary', '2500000');
    await settle();
    await save();

    controller
      .expectOne((r) => r.method === 'PUT')
      .flush(
        {
          type: '/problems/employee-not-found',
          title: 'Not found',
          status: 404,
          code: 'EMPLOYEE_NOT_FOUND',
        },
        { status: 404, statusText: 'Not Found' },
      );
    await settle();

    expect(q('not-found')?.textContent).toContain('This employee no longer exists');
  });

  it('leaving a changed form asks "Discard changes?"; leaving an unchanged one does not', async () => {
    const confirm = vi.spyOn(ConfirmationService.prototype, 'confirm').mockImplementation(function (
      this: ConfirmationService,
      c: Confirmation,
    ) {
      c.accept?.();
      return this;
    });
    await openEdit();

    await harness.navigateByUrl('/catalog');
    expect(confirm).not.toHaveBeenCalled();
    expect(router.url).toBe('/catalog');

    await harness.navigateByUrl('/catalog/101/edit');
    getRequest().flush(ASHA);
    await settle();
    type('salary', '1');
    await settle();

    await harness.navigateByUrl('/catalog');

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0].header ?? confirm.mock.calls[0][0].message).toContain(
      'Discard changes?',
    );
    expect(router.url).toBe('/catalog');

    // The add form is guarded the same way.
    await harness.navigateByUrl('/catalog/new');
    type('fullName', 'Chen Wei');
    await settle();
    await harness.navigateByUrl('/catalog');
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('"Keep editing" cancels the navigation', async () => {
    const confirm = vi.spyOn(ConfirmationService.prototype, 'confirm').mockImplementation(function (
      this: ConfirmationService,
      c: Confirmation,
    ) {
      c.reject?.();
      return this;
    });
    await openEdit();
    type('salary', '1');
    await settle();

    (q('drawer-close') as HTMLButtonElement).click();
    await settle();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/catalog/101/edit');
    expect(field('salary').value).toBe('1');
  });

  it('after a successful save, closing the drawer does not prompt', async () => {
    const confirm = vi.spyOn(ConfirmationService.prototype, 'confirm');
    await openEdit();
    type('salary', '2500000');
    await settle();
    await save();
    controller
      .expectOne((r) => r.method === 'PUT')
      .flush(employee({ salary: 2500000, version: 4 }));
    await settle();
    getRequest().flush(employee({ salary: 2500000, version: 4 }));
    await settle();

    (q('drawer-close') as HTMLButtonElement).click();
    await settle();

    expect(confirm).not.toHaveBeenCalled();
    expect(router.url).toBe('/catalog');
  });
});
