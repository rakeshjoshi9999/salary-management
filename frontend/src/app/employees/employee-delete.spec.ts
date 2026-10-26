import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Confirmation, ConfirmationService, MessageService } from 'primeng/api';

import { EmployeePage } from '../core/api.models';
import { API_INTERCEPTORS } from '../core/api-interceptors';
import { apiUrl } from '../core/api-url';
import { REFERENCE, employee } from '../core/testing/fixtures';
import { CatalogPage } from './catalog-page';
import { drawerRoutes } from './catalog.routes';

const ASHA = employee();
const BEN = employee({ id: 102, fullName: 'Ben Ode', email: 'ben.ode@acme.example' });

/** UI_DESIGN.md Delete confirmation and the delete flow; the real Catalog sits behind the drawer. */
describe('Deleting an employee', () => {
  let harness: RouterTestingHarness;
  let controller: HttpTestingController;
  let router: Router;
  let toast: ReturnType<typeof vi.spyOn>;

  const q = (testId: string) => document.querySelector(`[data-testid="${testId}"]`);

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
  }

  function listRequest(): TestRequest {
    return controller.expectOne((r) => r.method === 'GET' && r.url === apiUrl('/employees'));
  }

  function page(items: (typeof ASHA)[], p: number, totalPages: number): EmployeePage {
    return {
      items,
      page: p,
      size: 20,
      totalItems: (totalPages - 1) * 20 + items.length,
      totalPages,
    };
  }

  /** Opens Asha's drawer over page `p` of the list, with the confirm dialog answering `answer`. */
  async function openAsha(
    url: string,
    listPage: EmployeePage,
    answer: 'accept' | 'reject' | 'none' = 'accept',
  ): Promise<ReturnType<typeof vi.spyOn>> {
    const confirm = vi.spyOn(ConfirmationService.prototype, 'confirm').mockImplementation(function (
      this: ConfirmationService,
      c: Confirmation,
    ) {
      if (answer === 'accept') c.accept?.();
      if (answer === 'reject') c.reject?.();
      return this;
    });
    toast = vi.spyOn(MessageService.prototype, 'add');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'catalog', component: CatalogPage, children: drawerRoutes }]),
        provideHttpClient(withInterceptors(API_INTERCEPTORS)),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    controller.expectOne(apiUrl('/reference')).flush(REFERENCE);
    await settle();
    listRequest().flush(listPage);
    controller
      .expectOne((r) => r.method === 'GET' && r.url === apiUrl('/employees/101'))
      .flush(ASHA);
    await settle();
    return confirm;
  }

  async function clickDelete(): Promise<void> {
    (q('delete-button') as HTMLButtonElement).click();
    await settle();
  }

  function deleteRequest(): TestRequest {
    return controller.expectOne((r) => r.method === 'DELETE');
  }

  afterEach(() => {
    vi.restoreAllMocks();
    controller.verify();
  });

  it('Delete opens a confirm dialog that names the employee', async () => {
    const confirm = await openAsha('/catalog/101', page([ASHA, BEN], 0, 1), 'none');

    await clickDelete();

    expect(confirm).toHaveBeenCalledTimes(1);
    const options = confirm.mock.calls[0][0] as Confirmation;
    expect(options.header).toBe('Delete Asha Rao?');
    expect(options.message).toContain('disappear from the catalog and from insights');
    expect(options).toMatchObject({ acceptLabel: 'Delete', rejectLabel: 'Cancel' });
  });

  it('Cancel keeps the drawer open and sends nothing', async () => {
    await openAsha('/catalog/101?country=IN', page([ASHA, BEN], 0, 1), 'reject');

    await clickDelete();

    controller.expectNone((r) => r.method === 'DELETE');
    expect(router.url).toBe('/catalog/101?country=IN');
    expect(q('employee-details')).toBeTruthy();
  });

  it('confirming deletes, closes the drawer, says "Deleted" and reloads the list on the same page', async () => {
    await openAsha('/catalog/101?page=2', page([ASHA, BEN], 2, 3));

    await clickDelete();
    const request = deleteRequest();
    expect(request.request.url).toBe(apiUrl('/employees/101'));
    request.flush(null, { status: 204, statusText: 'No Content' });
    await settle();

    expect(router.url).toBe('/catalog?page=2');
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Deleted' }),
    );
    expect(listRequest().request.params.get('page')).toBe('2');
  });

  // The list reloads the same page first and steps back only if it came back empty: two requests,
  // but on fresh server state, so it stays right if someone else deleted at the same time.
  it('deleting the last row on a page reloads the previous page', async () => {
    await openAsha('/catalog/101?page=2', page([ASHA], 2, 3));

    await clickDelete();
    deleteRequest().flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    listRequest().flush(page([], 2, 2));
    await settle();

    expect(router.url).toBe('/catalog?page=1');
    expect(listRequest().request.params.get('page')).toBe('1');
    // Moving back a page after a delete is not a bad link, so no "part of the link" warning.
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
  });

  it('an employee already deleted (404) shows a toast and reloads the list', async () => {
    await openAsha('/catalog/101', page([ASHA, BEN], 0, 1));

    await clickDelete();
    deleteRequest().flush(
      {
        type: '/problems/employee-not-found',
        title: 'Not found',
        status: 404,
        code: 'EMPLOYEE_NOT_FOUND',
      },
      { status: 404, statusText: 'Not Found' },
    );
    await settle();

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Already deleted' }));
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ summary: 'Deleted' }));
    expect(router.url).toBe('/catalog');
    listRequest();
  });

  it('any other error shows a toast and keeps the drawer open', async () => {
    await openAsha('/catalog/101', page([ASHA, BEN], 0, 1));

    await clickDelete();
    deleteRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    await settle();

    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    expect(router.url).toBe('/catalog/101');
    expect(q('employee-details')).toBeTruthy();
    controller.expectNone((r) => r.method === 'GET' && r.url === apiUrl('/employees'));
  });
});
