import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService } from 'primeng/api';
import { Paginator } from 'primeng/paginator';

import { Employee, EmployeePage } from '../core/api.models';
import { apiErrorInterceptor } from '../core/api-error.interceptor';
import { apiUrl } from '../core/api-url';
import { REFERENCE, employee } from '../core/testing/fixtures';
import { CatalogPage } from './catalog-page';

@Component({ template: '<p>drawer</p>', changeDetection: ChangeDetectionStrategy.OnPush })
class StubDrawer {}

const EMPLOYEES_URL = apiUrl('/employees');

function page(items: Employee[], overrides: Partial<EmployeePage> = {}): EmployeePage {
  return { items, page: 0, size: 20, totalItems: items.length, totalPages: 1, ...overrides };
}

const ASHA = employee();
const BEN = employee({
  id: 102,
  fullName: 'Ben Ode',
  email: 'ben.ode@acme.example',
  jobTitle: 'QA Engineer',
  countryCode: 'DE',
  currency: 'EUR',
  salary: 48000,
  hireDate: '2019-11-02',
});

/** UI_DESIGN.md Catalog; the URL is the only source of truth (ADR-051). */
describe('CatalogPage', () => {
  let harness: RouterTestingHarness;
  let controller: HttpTestingController;
  let router: Router;

  const root = () => harness.routeNativeElement as HTMLElement;
  const byTestId = (id: string) => root().querySelector(`[data-testid="${id}"]`);

  async function open(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'catalog',
            component: CatalogPage,
            children: [
              { path: 'new', component: StubDrawer },
              { path: ':id', component: StubDrawer },
            ],
          },
        ]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        MessageService,
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    controller.expectOne(apiUrl('/reference')).flush(REFERENCE);
    await harness.fixture.whenStable();
  }

  function listRequest(): TestRequest {
    return controller.expectOne((r) => r.url === EMPLOYEES_URL);
  }

  async function respond(body: EmployeePage): Promise<void> {
    listRequest().flush(body);
    await harness.fixture.whenStable();
  }

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
  }

  function select(testId: string, value: string): void {
    const el = byTestId(testId) as HTMLSelectElement;
    el.value = value;
    el.dispatchEvent(new Event('change'));
  }

  function typeSearch(value: string): void {
    const input = byTestId('search-input') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function paginator(): Paginator {
    return harness.fixture.debugElement.query(By.directive(Paginator))
      .componentInstance as Paginator;
  }

  function changePage(first: number, rows: number): void {
    harness.fixture.debugElement
      .query(By.directive(Paginator))
      .triggerEventHandler('onPageChange', { first, rows, page: first / rows });
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('requests employees using the query from the URL', async () => {
    await open('/catalog?q=asha&country=IN&sort=salary,desc&page=2&size=50');

    const request = listRequest();

    expect(request.request.params.get('q')).toBe('asha');
    expect(request.request.params.get('country')).toBe('IN');
    expect(request.request.params.get('sort')).toBe('salary,desc');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    expect(request.request.params.has('department')).toBe(false);
  });

  it('shows each row with name and email, title, department, country, salary and hire date', async () => {
    await open('/catalog');
    await respond(page([ASHA, BEN], { totalItems: 2 }));

    const row = byTestId('row-101') as HTMLElement;

    for (const value of [
      'Asha Rao',
      'asha.rao@acme.example',
      'Software Engineer',
      'Engineering',
      'INR 2,400,000.00',
      '2021-04-12',
    ]) {
      expect(row.textContent).toContain(value);
    }
    expect(byTestId('row-102')?.textContent).toContain('EUR 48,000.00');
    // DE appears nowhere else in that row, so this proves the country column.
    expect(byTestId('row-102')?.textContent).toContain('DE');
  });

  it('shows the same employees as cards in the phone layout', async () => {
    await open('/catalog');
    await respond(page([ASHA, BEN]));

    const card = byTestId('card-101') as HTMLElement;

    expect(card.textContent).toContain('Asha Rao');
    expect(card.textContent).toContain('Software Engineer');
    expect(card.textContent).toContain('INR 2,400,000.00');
    expect(byTestId('card-102')?.textContent).toContain('DE');
  });

  it('shows the range and total', async () => {
    await open('/catalog');
    await respond(
      page(
        Array.from({ length: 20 }, (_, i) => employee({ id: 200 + i })),
        {
          totalItems: 10000,
          totalPages: 500,
        },
      ),
    );
    expect(byTestId('range-text')?.textContent?.trim()).toBe('1–20 of 10,000');

    await harness.navigateByUrl('/catalog?page=2');
    await respond(page([ASHA, BEN], { page: 2, totalItems: 42, totalPages: 3 }));
    expect(byTestId('range-text')?.textContent?.trim()).toBe('41–42 of 42');
  });

  it('waits 300 ms after typing before searching', async () => {
    await open('/catalog');
    await respond(page([ASHA]));
    // navigate() and routerLink both go through navigateByUrl, so this sees any navigation.
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl');
    vi.useFakeTimers();

    typeSearch('asha');
    vi.advanceTimersByTime(299);
    expect(navigateByUrl).not.toHaveBeenCalled();
    controller.expectNone((r) => r.url === EMPLOYEES_URL);

    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    await settle();

    expect(router.url).toBe('/catalog?q=asha');
    listRequest();
  });

  it('does not search on 1 character, and shows the hint', async () => {
    await open('/catalog?q=asha');
    await respond(page([ASHA]));
    expect(byTestId('search-hint')).toBeNull();
    vi.useFakeTimers();

    typeSearch('a');
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    await settle();

    expect(router.url).toBe('/catalog?q=asha');
    expect(byTestId('search-hint')?.textContent).toContain('Type at least 2 characters');
    expect(byTestId('row-101')).toBeTruthy();
    controller.expectNone((r) => r.url === EMPLOYEES_URL);
  });

  it('searching goes back to page 0 and replaces the URL instead of adding to history', async () => {
    await open('/catalog?page=3');
    await respond(page([ASHA], { page: 3, totalItems: 100, totalPages: 5 }));
    vi.useFakeTimers();

    typeSearch('ben');
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    await settle();

    expect(router.url).toBe('/catalog?q=ben');
    expect(router.lastSuccessfulNavigation()?.extras.replaceUrl).toBe(true);
    listRequest();
  });

  it('changing a filter navigates and goes back to page 0', async () => {
    await open('/catalog?page=2');
    await respond(page([ASHA], { page: 2, totalItems: 100, totalPages: 5 }));

    select('filter-country', 'DE');
    await settle();

    expect(router.url).toBe('/catalog?country=DE');
    expect(listRequest().request.params.get('country')).toBe('DE');
  });

  it('picking a department narrows the title options; clearing it restores them all', async () => {
    await open('/catalog');
    await respond(page([ASHA]));
    const titles = () =>
      Array.from((byTestId('filter-title') as HTMLSelectElement).options)
        .map((o) => o.value)
        .filter((v) => v !== '');
    expect(titles()).toEqual(['Account Executive', 'QA Engineer', 'Software Engineer']);

    select('filter-department', 'Sales');
    await settle();
    await respond(page([]));
    expect(titles()).toEqual(['Account Executive']);

    select('filter-department', '');
    await settle();
    await respond(page([ASHA]));
    expect(titles()).toEqual(['Account Executive', 'QA Engineer', 'Software Engineer']);
  });

  it('picking a department clears a selected title that is not in it', async () => {
    await open('/catalog?jobTitle=QA%20Engineer');
    await respond(page([BEN]));

    select('filter-department', 'Sales');
    await settle();

    expect(router.url).toBe('/catalog?department=Sales');
    await respond(page([]));

    await harness.navigateByUrl('/catalog?jobTitle=QA%20Engineer');
    await respond(page([BEN]));
    select('filter-department', 'Engineering');
    await settle();

    expect(router.url).toBe('/catalog?department=Engineering&jobTitle=QA%20Engineer');
  });

  it('clicking a sortable header toggles asc/desc; other headers do not sort', async () => {
    await open('/catalog');
    await respond(page([ASHA]));

    (byTestId('sort-salary') as HTMLButtonElement).click();
    await settle();
    expect(router.url).toBe('/catalog?sort=salary,asc');
    await respond(page([ASHA]));

    (byTestId('sort-salary') as HTMLButtonElement).click();
    await settle();
    expect(router.url).toBe('/catalog?sort=salary,desc');
    await respond(page([ASHA]));

    expect(byTestId('sort-fullName')).toBeTruthy();
    expect(byTestId('sort-hireDate')).toBeTruthy();
    expect(byTestId('sort-jobTitle')).toBeNull();
    expect(byTestId('sort-department')).toBeNull();
    expect(byTestId('sort-countryCode')).toBeNull();
  });

  it('changing the page navigates with a 0-based page', async () => {
    await open('/catalog?page=1');
    await respond(page([ASHA], { page: 1, totalItems: 100, totalPages: 5 }));
    expect(paginator().first).toBe(20);

    changePage(40, 20);
    await settle();

    expect(router.url).toBe('/catalog?page=2');
    expect(listRequest().request.params.get('page')).toBe('2');
  });

  it('changing the page size goes back to page 0', async () => {
    await open('/catalog?page=3');
    await respond(page([ASHA], { page: 3, totalItems: 100, totalPages: 5 }));

    changePage(60, 50);
    await settle();

    expect(router.url).toBe('/catalog?size=50');
  });

  it('invalid values in the link are replaced in the URL, with one toast', async () => {
    const add = vi.spyOn(MessageService.prototype, 'add');
    await open('/catalog?country=XX&size=37&foo=bar&department=Sales');
    await settle();

    expect(router.url).toBe('/catalog?department=Sales');
    expect(router.lastSuccessfulNavigation()?.extras.replaceUrl).toBe(true);
    expect(listRequest().request.params.get('department')).toBe('Sales');
    controller.expectNone((r) => r.params.get('country') === 'XX');
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][0]).toMatchObject({ severity: 'warn' });
  });

  it('a page past the end goes to the last page', async () => {
    const add = vi.spyOn(MessageService.prototype, 'add');
    await open('/catalog?page=900');
    await respond(page([], { page: 900, totalItems: 10000, totalPages: 500 }));

    expect(router.url).toBe('/catalog?page=499');
    expect(router.lastSuccessfulNavigation()?.extras.replaceUrl).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    await respond(page([ASHA], { page: 499, totalItems: 10000, totalPages: 500 }));

    // With nothing to show at all, page 0 is the last page.
    await harness.navigateByUrl('/catalog?country=DE&page=3');
    await respond(page([], { page: 3, totalItems: 0, totalPages: 0 }));
    expect(router.url).toBe('/catalog?country=DE');
    await respond(page([], { totalItems: 0, totalPages: 0 }));
    expect(byTestId('no-matches')).toBeTruthy();
  });

  it('a newer query cancels the response still pending from the previous one', async () => {
    await open('/catalog?country=IN');
    const first = listRequest();

    await harness.navigateByUrl('/catalog?country=DE');
    const second = listRequest();

    expect(first.cancelled).toBe(true);
    second.flush(page([BEN]));
    await settle();
    expect(byTestId('row-102')).toBeTruthy();
  });

  it('shows skeleton rows on first load, and dims the existing rows while the next page loads', async () => {
    await open('/catalog');
    expect(byTestId('catalog-skeleton')).toBeTruthy();
    await respond(page([ASHA], { totalItems: 100, totalPages: 5 }));
    expect(byTestId('catalog-skeleton')).toBeNull();

    changePage(20, 20);
    await settle();

    expect(byTestId('row-101')).toBeTruthy();
    expect(byTestId('catalog-results')?.getAttribute('data-loading')).toBe('true');
    await respond(page([BEN], { page: 1, totalItems: 100, totalPages: 5 }));
    expect(byTestId('catalog-results')?.getAttribute('data-loading')).toBe('false');
  });

  it('an empty catalog shows "No employees yet" with Add', async () => {
    await open('/catalog');
    await respond(page([], { totalItems: 0, totalPages: 0 }));

    expect(byTestId('empty-catalog')?.textContent).toContain('No employees yet');
    expect(byTestId('no-matches')).toBeNull();

    (byTestId('empty-add') as HTMLButtonElement).click();
    await settle();
    expect(router.url).toBe('/catalog/new');
  });

  it('no matches shows "No one matches these filters"; Clear filters goes to /catalog', async () => {
    await open('/catalog?country=DE&q=zzz');
    await respond(page([], { totalItems: 0, totalPages: 0 }));

    expect(byTestId('no-matches')?.textContent).toContain('No one matches these filters');
    expect(byTestId('empty-catalog')).toBeNull();

    (byTestId('clear-filters') as HTMLButtonElement).click();
    await settle();
    expect(router.url).toBe('/catalog');
    listRequest();
  });

  it('an error shows the error message, and Retry fetches again', async () => {
    await open('/catalog');
    listRequest().flush('down', { status: 503, statusText: 'Unavailable' });
    await settle();

    expect(byTestId('catalog-error')?.textContent).toContain("Couldn't load employees");

    (byTestId('catalog-retry') as HTMLButtonElement).click();
    await settle();
    await respond(page([ASHA]));

    expect(byTestId('catalog-error')).toBeNull();
    expect(byTestId('row-101')).toBeTruthy();
  });

  it('clicking a row opens /catalog/:id and keeps the list query', async () => {
    await open('/catalog?country=IN&page=1');
    await respond(page([ASHA], { page: 1, totalItems: 30, totalPages: 2 }));

    (byTestId('row-101') as HTMLElement).click();
    await settle();

    expect(router.url).toBe('/catalog/101?country=IN&page=1');
  });

  it('Add employee opens /catalog/new and keeps the query', async () => {
    await open('/catalog?country=IN');
    await respond(page([ASHA]));

    (byTestId('add-employee') as HTMLButtonElement).click();
    await settle();

    expect(router.url).toBe('/catalog/new?country=IN');
  });

  it('the phone filter button shows the number of active filters', async () => {
    await open('/catalog?country=IN&department=Engineering&q=asha');
    await respond(page([ASHA]));

    // The search box sits outside the panel, so q does not count.
    expect(byTestId('filters-toggle')?.textContent?.trim()).toBe('Filters (2)');
  });

  it('the phone Sort dropdown navigates with the chosen sort', async () => {
    await open('/catalog');
    await respond(page([ASHA]));

    select('sort-select', 'hireDate,desc');
    await settle();

    expect(router.url).toBe('/catalog?sort=hireDate,desc');
    listRequest();
  });
});
