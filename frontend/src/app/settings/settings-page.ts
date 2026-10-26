import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { Settings } from '../core/api.models';
import { ApiError } from '../core/api-error';
import { ReferenceStore } from '../core/reference.store';
import { StatePanel } from '../shared/state-panel';
import { SettingsService } from './settings.service';

/**
 * Settings: the default country the Insights dashboard opens on (ADR-028, UI_DESIGN.md). A stale save
 * reloads instead of keeping the choice, since there is only one field to lose.
 */
@Component({
  selector: 'app-settings-page',
  imports: [ButtonModule, SkeletonModule, StatePanel],
  templateUrl: './settings-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);
  private readonly toast = inject(MessageService);
  protected readonly reference = inject(ReferenceStore);

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly saved = signal<Settings | null>(null);
  protected readonly selected = signal('');
  protected readonly saving = signal(false);

  protected readonly changed = computed(
    () => this.saved() !== null && this.selected() !== this.saved()?.defaultCountryCode,
  );
  protected readonly currency = computed(
    () => this.reference.country(this.selected())?.currency ?? '',
  );

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.reference.load();
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.settingsService
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => this.show(settings),
        error: () => this.status.set('error'),
      });
  }

  protected choose(code: string): void {
    this.selected.set(code);
  }

  protected save(): void {
    const current = this.saved();
    if (!current || !this.changed() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.settingsService
      .update({ defaultCountryCode: this.selected(), version: current.version })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (settings) => {
          this.saving.set(false);
          this.show(settings);
          this.toast.add({ severity: 'success', summary: 'Saved', life: 3000 });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          if (error instanceof ApiError && error.code === 'STALE_VERSION') {
            this.toast.add({
              severity: 'warn',
              summary: 'Settings were changed elsewhere',
              detail: 'They have been reloaded.',
            });
            this.load();
            return;
          }
          this.toast.add({
            severity: 'error',
            summary: "Couldn't save settings",
            detail: 'Try again.',
          });
        },
      });
  }

  private show(settings: Settings): void {
    this.saved.set(settings);
    this.selected.set(settings.defaultCountryCode);
    this.status.set('ready');
  }
}
