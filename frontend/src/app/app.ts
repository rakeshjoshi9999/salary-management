import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

import { ColdStartTracker } from './core/cold-start';
import { ReferenceStore } from './core/reference.store';
import { ThemeMode, ThemeService } from './core/theme';
import { Icon, IconName } from './shared/icon';

const MODE_LABEL: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const MODE_ICON: Record<ThemeMode, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };

/**
 * The app shell: top bar with the theme toggle, bottom tabs on phones, toasts, and the two app-wide
 * banners (cold start, reference data). Reference data starts loading here, at app start, without
 * blocking any route (ADR-051, ADR-054).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, ToastModule, Icon],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly coldStart = inject(ColdStartTracker);
  protected readonly reference = inject(ReferenceStore);
  protected readonly theme = inject(ThemeService);

  protected readonly links = [
    { path: '/', label: 'Insights', icon: 'chart', exact: true },
    { path: '/catalog', label: 'Catalog', icon: 'users', exact: false },
  ] as const;

  protected readonly tabs = [
    ...this.links,
    { path: '/settings', label: 'Settings', icon: 'settings', exact: false },
  ] as const;

  protected readonly themeLabel = computed(
    () =>
      `Theme: ${MODE_LABEL[this.theme.mode()]}. ` +
      `Switch to ${MODE_LABEL[this.theme.nextMode()].toLowerCase()}`,
  );
  protected readonly themeIcon = computed(() => MODE_ICON[this.theme.mode()]);

  constructor() {
    this.reference.load();
  }
}
