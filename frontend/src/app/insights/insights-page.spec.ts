import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService } from 'primeng/api';

import { routes } from '../app.routes';
import { CountryInsights } from '../core/api.models';
import { API_INTERCEPTORS } from '../core/api-interceptors';
import { apiUrl } from '../core/api-url';
import { REFERENCE } from '../core/testing/fixtures';
import { environment } from '../../environments/environment';
import { HealthPage } from '../health/health-page';
import { DepartmentDoughnut } from './department-doughnut';
import { InsightsPage } from './insights-page';

const INDIA: CountryInsights = {
  countryCode: 'IN',
  currency: 'INR',
  salary: {
    headcount: 3500,
    min: 400000,
    max: 4995000,
    average: 1528176,
    median: 1109000,
  },
  averageByJobTitle: [
    { jobTitle: 'Software Engineer', department: 'Engineering', headcount: 40, average: 3000000 },
    { jobTitle: 'QA Engineer', department: 'Engineering', headcount: 180, average: 1500000 },
    { jobTitle: 'Account Executive', department: 'Sales', headcount: 10, average: 750000 },
  ],
  // Headcount order, which an alphabetical sort would change; uneven, so percentages round.
  headcountByDepartment: [
    { department: 'Sales', headcount: 2000 },
    { department: 'Engineering', headcount: 1000 },
    { department: 'Finance', headcount: 500 },
  ],
};

const EMPTY_GERMANY: CountryInsights = {
  countryCode: 'DE',
  currency: 'EUR',
  salary: { headcount: 0, min: null, max: null, average: null, median: null },
  averageByJobTitle: [],
  headcountByDepartment: [],
};

/** UI_DESIGN.md Insights dashboard and the "View insights" flow (ADR-017, ADR-027, ADR-029). */
describe('InsightsPage', () => {
  let harness: RouterTestingHarness;
  let controller: HttpTestingController;
  let router: Router;
  let toast: ReturnType<typeof vi.spyOn>;

  const root = () => harness.routeNativeElement as HTMLElement;
  const q = (testId: string) => root().querySelector(`[data-testid="${testId}"]`);
  const all = (testId: string) => Array.from(root().querySelectorAll(`[data-testid="${testId}"]`));
  const text = (testId: string) => q(testId)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
  }

  async function open(url: string): Promise<void> {
    toast = vi.spyOn(MessageService.prototype, 'add');
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors(API_INTERCEPTORS)),
        provideHttpClientTesting(),
        MessageService,
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    controller.expectOne(apiUrl('/reference')).flush(REFERENCE);
    await settle();
  }

  function settingsRequest(): TestRequest {
    return controller.expectOne((r) => r.method === 'GET' && r.url === apiUrl('/settings'));
  }

  function insightsRequest(code: string): TestRequest {
    return controller.expectOne(apiUrl(`/insights/countries/${code}`));
  }

  async function showIndia(): Promise<void> {
    await open('/?country=IN');
    insightsRequest('IN').flush(INDIA);
    await settle();
  }

  afterEach(() => {
    vi.restoreAllMocks();
    controller.verify();
  });

  it('/ shows the Insights dashboard; /health still shows the health page', async () => {
    await open('/?country=IN');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(InsightsPage);
    insightsRequest('IN').flush(INDIA);
    await settle();

    await harness.navigateByUrl('/health');

    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(HealthPage);
    controller.expectOne(`${environment.apiBaseUrl}/actuator/health`);
  });

  it('a country in the URL is used without asking for the settings', async () => {
    await open('/?country=DE');

    insightsRequest('DE').flush(EMPTY_GERMANY);
    controller.expectNone(apiUrl('/settings'));
  });

  it('with no country in the URL, the saved default country is used', async () => {
    await open('/');

    settingsRequest().flush({ defaultCountryCode: 'DE', version: 3 });
    await settle();

    insightsRequest('DE').flush(EMPTY_GERMANY);
    expect(router.url).toBe('/');
  });

  it('if loading the settings fails, India is used', async () => {
    await open('/');

    settingsRequest().flush('down', { status: 503, statusText: 'Unavailable' });
    await settle();

    insightsRequest('IN').flush(INDIA);
  });

  it('shows five cards: headcount, median, average, min and max', async () => {
    await showIndia();

    expect(text('stat-headcount')).toContain('3,500');
    expect(text('stat-median')).toContain('INR 1,109,000.00');
    expect(text('stat-average')).toContain('INR 1,528,176.00');
    expect(text('stat-min')).toContain('INR 400,000.00');
    expect(text('stat-max')).toContain('INR 4,995,000.00');
  });

  it('average-by-title rows keep the API order, each bar scaled to the highest average', async () => {
    await showIndia();

    const rows = all('title-row');
    expect(
      rows.map((r) => r.querySelector('[data-testid="title-name"]')?.textContent?.trim()),
    ).toEqual(['Software Engineer', 'QA Engineer', 'Account Executive']);
    const widths = all('title-bar').map((bar) => (bar as HTMLElement).style.width);
    expect(widths).toEqual(['100%', '50%', '25%']);
    expect(rows[1].textContent).toContain('INR 1,500,000.00');
  });

  it('each title row shows its department and headcount', async () => {
    await showIndia();

    const second = all('title-row')[1].textContent?.replace(/\s+/g, ' ') ?? '';

    expect(second).toContain('Engineering');
    expect(second).toContain('180');
  });

  it('the doughnut gets the departments in the API order', async () => {
    await showIndia();

    const doughnut = harness.fixture.debugElement.query(By.directive(DepartmentDoughnut))
      .componentInstance as DepartmentDoughnut;

    expect(doughnut.departments()).toEqual(INDIA.headcountByDepartment);
    expect(doughnut.total()).toBe(3500);
  });

  it('the legend shows each department with its count and percentage', async () => {
    await showIndia();

    const legend = all('legend-row').map((row) => row.textContent?.replace(/\s+/g, ' ').trim());

    expect(legend).toEqual(['Sales 2,000 57%', 'Engineering 1,000 29%', 'Finance 500 14%']);
  });

  it('the centre of the doughnut shows the total headcount', async () => {
    await showIndia();

    expect(text('doughnut-total')).toContain('3,500');
  });

  it('choosing another country changes ?country= only, and does not save the default', async () => {
    await showIndia();

    const select = q('insights-country') as HTMLSelectElement;
    select.value = 'DE';
    select.dispatchEvent(new Event('change'));
    await settle();

    expect(router.url).toBe('/?country=DE');
    insightsRequest('DE').flush(EMPTY_GERMANY);
    controller.expectNone((r) => r.method === 'PUT');
  });

  it('a headcount of 0 shows "No employees in {country} yet" with a link to the Catalog', async () => {
    await open('/?country=DE');
    insightsRequest('DE').flush(EMPTY_GERMANY);
    await settle();

    expect(text('insights-empty')).toContain('No employees in Germany yet');
    expect(q('insights-empty')?.querySelector('a')?.getAttribute('href')).toBe('/catalog');
    expect(q('stat-median')).toBeNull();
  });

  it('an unsupported country (404) falls back to the default country, with a toast', async () => {
    await open('/?country=FR');

    insightsRequest('FR').flush(
      {
        type: '/problems/country-not-found',
        title: 'Not found',
        status: 404,
        code: 'COUNTRY_NOT_FOUND',
      },
      { status: 404, statusText: 'Not Found' },
    );
    await settle();
    settingsRequest().flush({ defaultCountryCode: 'IN', version: 0 });
    await settle();

    insightsRequest('IN').flush(INDIA);
    await settle();
    expect(router.url).toBe('/');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
    expect(text('stat-headcount')).toContain('3,500');
  });

  it('shows skeleton cards and bars while loading', async () => {
    await open('/?country=IN');

    expect(q('insights-skeleton')).toBeTruthy();
    expect(q('stat-headcount')).toBeNull();

    insightsRequest('IN').flush(INDIA);
    await settle();
    expect(q('insights-skeleton')).toBeNull();
  });

  it('an error shows "Couldn\'t load insights" with Retry', async () => {
    await open('/?country=IN');
    insightsRequest('IN').flush('boom', { status: 500, statusText: 'Server Error' });
    await settle();

    expect(text('insights-error')).toContain("Couldn't load insights");

    (q('insights-retry') as HTMLButtonElement).click();
    await settle();
    insightsRequest('IN').flush(INDIA);
    await settle();

    expect(q('insights-error')).toBeNull();
    expect(text('stat-headcount')).toContain('3,500');
  });

  it('the dashboard and its chart load lazily, outside the initial bundle', async () => {
    const landing = routes.find((route) => route.path === '');

    expect(landing?.component).toBeUndefined();
    expect(await landing?.loadComponent?.()).toBe(InsightsPage);
  });
});
