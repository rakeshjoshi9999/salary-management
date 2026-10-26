import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ConfirmationService, MessageService } from 'primeng/api';

import { App } from './app';
import { routes } from './app.routes';
import { API_INTERCEPTORS } from './core/api-interceptors';
import { apiUrl } from './core/api-url';
import { ColdStartTracker } from './core/cold-start';
import { REFERENCE } from './core/testing/fixtures';
import { provideShellTesting } from './core/testing/provide-shell-testing';
import { PanelState, StatePanel } from './shared/state-panel';

@Component({
  imports: [StatePanel],
  template: `<app-state-panel
    [state]="state()"
    [message]="message()"
    [actionLabel]="actionLabel()"
    (action)="actions = actions + 1"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class PanelHost {
  readonly state = signal<PanelState>('loading');
  readonly message = signal('');
  readonly actionLabel = signal('');
  actions = 0;
}

/** Every data view handles loading, empty and error states (CLAUDE.md; UI_DESIGN.md States). */
describe('Loading, empty and error states', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('the shared state panel shows a skeleton, an empty message with an optional action, or an error with Retry', async () => {
    const fixture: ComponentFixture<PanelHost> = TestBed.createComponent(PanelHost);
    const host = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;
    const panel = () => el.querySelector('[data-testid="state-panel"]') as HTMLElement;
    const button = () =>
      el.querySelector('[data-testid="state-action"]') as HTMLButtonElement | null;
    await fixture.whenStable();

    expect(panel().getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('p-skeleton')).toBeTruthy();
    expect(button()).toBeNull();

    host.state.set('empty');
    host.message.set('No employees yet');
    await fixture.whenStable();
    expect(panel().textContent).toContain('No employees yet');
    expect(button()).toBeNull();
    expect(el.querySelector('p-skeleton')).toBeNull();
    expect(panel().getAttribute('aria-busy')).not.toBe('true');
    expect(panel().getAttribute('role')).not.toBe('alert');

    host.actionLabel.set('Add employee');
    await fixture.whenStable();
    expect(button()?.textContent?.trim()).toBe('Add employee');
    button()?.click();
    expect(host.actions).toBe(1);

    host.state.set('error');
    host.message.set("Couldn't load employees");
    host.actionLabel.set('');
    await fixture.whenStable();
    expect(panel().getAttribute('role')).toBe('alert');
    expect(el.querySelector('p-skeleton')).toBeNull();
    expect(panel().getAttribute('aria-busy')).not.toBe('true');
    expect(panel().textContent).toContain("Couldn't load employees");
    expect(button()?.textContent?.trim()).toBe('Retry');
    button()?.click();
    expect(host.actions).toBe(2);
  });

  it('the cold-start banner says the server is waking and can take up to a minute', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: provideShellTesting() });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    TestBed.inject(ColdStartTracker).slowStarted();
    await fixture.whenStable();

    const banner = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="cold-start-banner"]',
    );
    expect(banner?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Waking the server… this can take up to a minute.',
    );
  });

  describe('on routed pages', () => {
    let harness: RouterTestingHarness;
    let controller: HttpTestingController;

    const q = (testId: string) =>
      (harness.fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

    async function open(url: string, flushReference = true): Promise<void> {
      TestBed.configureTestingModule({
        providers: [
          provideRouter(routes),
          provideHttpClient(withInterceptors(API_INTERCEPTORS)),
          provideHttpClientTesting(),
          MessageService,
          ConfirmationService,
        ],
      });
      controller = TestBed.inject(HttpTestingController);
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      if (flushReference) {
        controller.expectOne(apiUrl('/reference')).flush(REFERENCE);
      }
      await harness.fixture.whenStable();
    }

    it('a Catalog TIMEOUT shows the error state with Retry', async () => {
      // Real time keeps moving so the router can settle; advanceTimersByTime jumps the 90 s.
      vi.useFakeTimers({
        toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'],
        shouldAdvanceTime: true,
      });
      await open('/catalog');
      const pending = controller.expectOne((r) => r.url === apiUrl('/employees'));

      vi.advanceTimersByTime(90_000);
      vi.useRealTimers();
      await harness.fixture.whenStable();

      expect(pending.cancelled).toBe(true);
      expect(q('catalog-error')?.textContent).toContain("Couldn't load employees");
      expect(q('catalog-retry')).toBeTruthy();
    });

    it('filters and form dropdowns stay disabled until the reference data is ready', async () => {
      await open('/catalog/new', false);

      for (const id of ['filter-country', 'filter-department', 'filter-title']) {
        expect((q(id) as HTMLSelectElement | null)?.disabled ?? true).toBe(true);
      }
      for (const id of ['field-department', 'field-countryCode']) {
        expect((q(id) as HTMLSelectElement | null)?.disabled ?? true).toBe(true);
      }

      // Disabled fields skip validation, so Save itself waits too.
      expect((q('save') as HTMLButtonElement).disabled).toBe(true);

      controller.expectOne(apiUrl('/reference')).flush(REFERENCE);
      await harness.fixture.whenStable();
      controller.expectOne((r) => r.url === apiUrl('/employees'));
      await harness.fixture.whenStable();

      // Every one is present and enabled, which also proves the "missing counts as disabled"
      // fallback above did not hide a wrong test id.
      for (const id of [
        'filter-country',
        'filter-department',
        'filter-title',
        'field-department',
        'field-countryCode',
      ]) {
        expect((q(id) as HTMLSelectElement).disabled).toBe(false);
      }
    });

    it('the drawer view shows a skeleton while loading', async () => {
      await open('/catalog/101');
      controller.expectOne((r) => r.url === apiUrl('/employees'));

      expect(q('drawer-skeleton')?.getAttribute('aria-busy')).toBe('true');
      expect(q('employee-details')).toBeNull();
      controller.expectOne(apiUrl('/employees/101'));
    });

    it('a NETWORK_ERROR on any page shows that page error state, not a blank page', async () => {
      const offline = { status: 0, statusText: 'Unknown Error' };

      await open('/catalog');
      controller
        .expectOne((r) => r.url === apiUrl('/employees'))
        .error(new ProgressEvent('error'), offline);
      await harness.fixture.whenStable();
      expect(q('catalog-error')).toBeTruthy();

      await harness.navigateByUrl('/catalog/101');
      controller.match((r) => r.url === apiUrl('/employees'));
      controller.expectOne(apiUrl('/employees/101')).error(new ProgressEvent('error'), offline);
      await harness.fixture.whenStable();
      expect(q('drawer-error')).toBeTruthy();

      await TestBed.inject(Router).navigateByUrl('/settings');
      await harness.fixture.whenStable();
      controller.expectOne(apiUrl('/settings')).error(new ProgressEvent('error'), offline);
      await harness.fixture.whenStable();
      expect(q('settings-error')).toBeTruthy();

      await harness.navigateByUrl('/?country=IN');
      controller
        .expectOne(apiUrl('/insights/countries/IN'))
        .error(new ProgressEvent('error'), offline);
      await harness.fixture.whenStable();
      expect(q('insights-error')).toBeTruthy();
    });
  });
});
