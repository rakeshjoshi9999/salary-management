import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';

import { ColdStartTracker } from './core/cold-start';
import { ReferenceStore } from './core/reference.store';

/**
 * The app shell: top bar, phone menu, toasts, and the two app-wide banners (cold start, reference
 * data). Reference data starts loading here, at app start, without blocking any route (ADR-051).
 */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    ConfirmDialogModule,
    DrawerModule,
    ToastModule,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly coldStart = inject(ColdStartTracker);
  protected readonly reference = inject(ReferenceStore);
  protected readonly menuOpen = signal(false);

  protected readonly links = [
    { path: '/', label: 'Insights', exact: true },
    { path: '/catalog', label: 'Catalog', exact: false },
  ] as const;

  constructor() {
    this.reference.load();
  }
}
