import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MessageService } from 'primeng/api';

import { API_INTERCEPTORS } from '../core/api-interceptors';
import { apiUrl } from '../core/api-url';
import { REFERENCE } from '../core/testing/fixtures';
import { SettingsPage } from './settings-page';

/** UI_DESIGN.md Settings and ADR-028: the default country Insights opens on. */
describe('SettingsPage', () => {
  let harness: RouterTestingHarness;
  let controller: HttpTestingController;
  let toast: ReturnType<typeof vi.spyOn>;

  const q = (testId: string) =>
    (harness.routeNativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
  const country = () => q('settings-country') as HTMLSelectElement;

  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
  }

  function settingsGet(): TestRequest {
    return controller.expectOne((r) => r.method === 'GET' && r.url === apiUrl('/settings'));
  }

  async function open(): Promise<void> {
    toast = vi.spyOn(MessageService.prototype, 'add');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'settings', component: SettingsPage }]),
        provideHttpClient(withInterceptors(API_INTERCEPTORS)),
        provideHttpClientTesting(),
        MessageService,
      ],
    });
    controller = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/settings');
    controller.expectOne(apiUrl('/reference')).flush(REFERENCE);
    await settle();
  }

  async function loaded(code = 'IN', version = 0): Promise<void> {
    settingsGet().flush({ defaultCountryCode: code, version });
    await settle();
  }

  async function choose(code: string): Promise<void> {
    country().value = code;
    country().dispatchEvent(new Event('change'));
    await settle();
  }

  async function save(): Promise<void> {
    (q('settings-save') as HTMLButtonElement).click();
    await settle();
  }

  afterEach(() => {
    controller.verify();
    vi.restoreAllMocks();
  });

  it('shows a skeleton, then the saved default country', async () => {
    await open();
    expect(q('settings-skeleton')).toBeTruthy();
    expect(q('settings-country')).toBeNull();

    // IN, not the first option, so a select that ignores the loaded value cannot pass.
    await loaded('IN', 2);

    expect(q('settings-skeleton')).toBeNull();
    expect(country().value).toBe('IN');
  });

  it('Save sends PUT with the version and shows a "Saved" toast', async () => {
    await open();
    await loaded('IN', 2);
    await choose('DE');

    await save();

    const put = controller.expectOne((r) => r.method === 'PUT');
    expect(put.request.url).toBe(apiUrl('/settings'));
    expect(put.request.body).toEqual({ defaultCountryCode: 'DE', version: 2 });
    put.flush({ defaultCountryCode: 'DE', version: 3 });
    await settle();

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Saved' }),
    );
    // The next save carries the new version.
    await choose('IN');
    await save();
    const second = controller.expectOne((r) => r.method === 'PUT');
    expect(second.request.body).toEqual({ defaultCountryCode: 'IN', version: 3 });
    second.flush({ defaultCountryCode: 'IN', version: 4 });
    await settle();
  });

  it('Save is disabled when nothing has changed', async () => {
    await open();
    await loaded('IN');
    expect((q('settings-save') as HTMLButtonElement).disabled).toBe(true);

    await choose('DE');
    expect((q('settings-save') as HTMLButtonElement).disabled).toBe(false);

    await choose('IN');
    expect((q('settings-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('a stale save shows "Settings were changed elsewhere" and reloads them', async () => {
    await open();
    await loaded('IN', 0);
    await choose('DE');
    await save();

    controller
      .expectOne((r) => r.method === 'PUT')
      .flush(
        {
          type: '/problems/stale-version',
          title: 'Stale',
          status: 409,
          code: 'STALE_VERSION',
          currentVersion: 1,
        },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: 'Settings were changed elsewhere' }),
    );
    await loaded('IN', 1);
    expect(country().value).toBe('IN');

    // The reloaded version is the one the next save sends, so it does not conflict again.
    await choose('DE');
    await save();
    const retry = controller.expectOne((r) => r.method === 'PUT');
    expect(retry.request.body).toEqual({ defaultCountryCode: 'DE', version: 1 });
    retry.flush({ defaultCountryCode: 'DE', version: 2 });
    await settle();
  });

  it('a load error shows "Couldn\'t load settings" with Retry', async () => {
    await open();
    settingsGet().flush('down', { status: 503, statusText: 'Unavailable' });
    await settle();

    expect(q('settings-error')?.textContent).toContain("Couldn't load settings");

    (q('settings-retry') as HTMLButtonElement).click();
    await settle();
    await loaded('IN');

    expect(q('settings-error')).toBeNull();
    expect(country().value).toBe('IN');
  });

  it('shows the currency of the selected country', async () => {
    await open();
    await loaded('IN');
    expect(q('settings-currency')?.textContent).toContain('INR');
    expect(q('settings-currency')?.textContent).not.toContain('EUR');

    await choose('DE');

    expect(q('settings-currency')?.textContent).toContain('EUR');
    expect(q('settings-currency')?.textContent).not.toContain('INR');
  });
});
