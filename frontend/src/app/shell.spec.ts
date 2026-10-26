import { HttpTestingController } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, Routes } from '@angular/router';
import { Toast } from 'primeng/toast';

import { App } from './app';
import { routes } from './app.routes';
import { apiUrl } from './core/api-url';
import { ColdStartTracker } from './core/cold-start';
import { REFERENCE } from './core/testing/fixtures';
import { provideShellTesting } from './core/testing/provide-shell-testing';

@Component({ template: '<p>stub</p>', changeDetection: ChangeDetectionStrategy.OnPush })
class StubPage {}

const stubRoutes: Routes = [
  { path: '', component: StubPage },
  { path: 'catalog', component: StubPage },
  { path: 'settings', component: StubPage },
];

/** The app shell: top bar, phone menu, and the app-wide banners (UI_DESIGN.md, ADR-051). */
describe('App shell', () => {
  let fixture: ComponentFixture<App>;
  let controller: HttpTestingController;

  const el = () => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string) => el().querySelector(`[data-testid="${id}"]`);

  async function create(withRoutes: Routes): Promise<void> {
    TestBed.configureTestingModule({
      imports: [App],
      providers: provideShellTesting(withRoutes),
    });
    fixture = TestBed.createComponent(App);
    controller = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  async function navigate(url: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
  }

  it('serves the health page at /health', async () => {
    await create(routes);
    controller.expectOne(apiUrl('/reference')).flush(REFERENCE);

    await navigate('/health');

    expect(el().querySelector('app-health-page')).toBeTruthy();
  });

  it('shows Insights, Catalog and Settings links in the top bar', async () => {
    await create(stubRoutes);

    const nav = byTestId('top-nav') as HTMLElement;
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    expect(hrefs).toEqual(['/', '/catalog', '/settings']);
    expect(nav.textContent).toContain('Insights');
    expect(nav.textContent).toContain('Catalog');
    expect(nav.querySelector('a[href="/settings"]')?.getAttribute('aria-label')).toBe('Settings');
  });

  it('marks the current section as active', async () => {
    await create(stubRoutes);

    await navigate('/catalog');

    const nav = byTestId('top-nav') as HTMLElement;
    expect(nav.querySelector('a[href="/catalog"]')?.getAttribute('aria-current')).toBe('page');
    expect(nav.querySelector('a[href="/"]')?.getAttribute('aria-current')).toBeNull();
  });

  it('opens a menu with the same links on phones', async () => {
    await create(stubRoutes);
    expect(document.querySelector('[data-testid="mobile-menu"]')).toBeNull();

    (byTestId('menu-button') as HTMLButtonElement).click();
    await fixture.whenStable();

    const menu = document.querySelector('[data-testid="mobile-menu"]') as HTMLElement;
    expect(menu).toBeTruthy();
    const hrefs = Array.from(menu.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/', '/catalog', '/settings']);
  });

  it('shows the cold-start banner while the server is waking', async () => {
    await create(stubRoutes);
    expect(byTestId('cold-start-banner')).toBeNull();
    const tracker = TestBed.inject(ColdStartTracker);

    tracker.slowStarted();
    await fixture.whenStable();
    expect(byTestId('cold-start-banner')).toBeTruthy();

    tracker.slowFinished();
    await fixture.whenStable();
    expect(byTestId('cold-start-banner')).toBeNull();
  });

  it('shows toasts at the bottom right, clear of the drawer close button', async () => {
    await create(stubRoutes);

    // The drawer opens on the right with its close button at the top; a top-right toast covered it,
    // and hovering a toast pauses it, so the drawer could not be closed (found while recording the demo).
    const toast = fixture.debugElement.query(By.directive(Toast)).componentInstance as Toast;

    expect(toast.position).toBe('bottom-right');
  });

  it('shows an app-level reference error with a Retry that recovers', async () => {
    await create(stubRoutes);

    controller
      .expectOne(apiUrl('/reference'))
      .flush('down', { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(byTestId('reference-error')).toBeTruthy();

    (byTestId('reference-retry') as HTMLButtonElement).click();
    controller.expectOne(apiUrl('/reference')).flush(REFERENCE);
    await fixture.whenStable();

    expect(byTestId('reference-error')).toBeNull();
  });
});
