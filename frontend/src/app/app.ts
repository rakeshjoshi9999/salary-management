import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

import { ColdStartTracker } from './core/cold-start';
import { ReferenceStore } from './core/reference.store';
import { Icon } from './shared/icon';

/**
 * The app shell: top bar, phone menu, toasts, and the two app-wide banners (cold start, reference
 * data). Reference data starts loading here, at app start, without blocking any route (ADR-051).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, ToastModule, Icon],
  templateUrl: './app.html',
  host: { '(document:keydown.escape)': 'closeMenu()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly coldStart = inject(ColdStartTracker);
  protected readonly reference = inject(ReferenceStore);
  protected readonly menuOpen = signal(false);

  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  /** Escape closes the phone menu and puts focus back on its button. */
  protected closeMenu(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.menuButton()?.nativeElement.focus();
    }
  }

  protected readonly links = [
    { path: '/', label: 'Insights', exact: true },
    { path: '/catalog', label: 'Catalog', exact: false },
  ] as const;

  constructor() {
    this.reference.load();
    // Any navigation closes the phone menu, including Back and the title link.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }
}
