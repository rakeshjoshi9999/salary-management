import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { Icon, IconName } from './icon';

export type PanelState = 'loading' | 'empty' | 'error';

/**
 * One loading, empty or error panel for every data view (CLAUDE.md; UI_DESIGN.md States).
 * Presentational only: the page decides the state and what the action does.
 */
@Component({
  selector: 'app-state-panel',
  imports: [ButtonModule, SkeletonModule, Icon],
  host: { class: 'block' },
  template: `
    <div
      data-testid="state-panel"
      [attr.role]="state() === 'error' ? 'alert' : null"
      [attr.aria-busy]="state() === 'loading' ? 'true' : null"
      [class]="frame()"
    >
      @if (state() === 'loading') {
        <span class="sr-only">{{ message() || 'Loading' }}</span>
        <div class="flex flex-col gap-2">
          @for (row of skeletonRows; track row) {
            <p-skeleton height="3rem" />
          }
        </div>
      } @else {
        <span
          data-testid="state-icon"
          aria-hidden="true"
          [class]="
            state() === 'error'
              ? 'mx-auto mb-3 grid size-11 place-items-center rounded-full bg-card text-danger'
              : 'mx-auto mb-3 grid size-11 place-items-center rounded-full bg-subtle text-primary'
          "
        >
          <app-icon [name]="state() === 'error' ? 'x-circle' : 'users'" size="1.35em" />
        </span>
        <p [class]="state() === 'error' ? 'font-medium text-danger' : 'font-medium text-ink'">
          {{ message() }}
        </p>
        @if (detail()) {
          <p
            [class]="
              state() === 'error' ? 'mt-1 text-sm text-danger' : 'mt-1 text-sm text-ink-muted'
            "
          >
            {{ detail() }}
          </p>
        }
        @if (buttonLabel()) {
          <button
            pButton
            type="button"
            class="mt-4"
            [attr.data-testid]="actionId()"
            [severity]="state() === 'error' ? 'danger' : 'primary'"
            [outlined]="state() === 'empty' && !primaryAction()"
            (click)="action.emit()"
          >
            @if (actionIcon(); as icon) {
              <app-icon [name]="icon" class="mr-2" />
            }
            {{ buttonLabel() }}
          </button>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatePanel {
  readonly state = input.required<PanelState>();
  readonly message = input('');
  readonly detail = input('');
  /** The empty state's action. An error always offers Retry. */
  readonly actionLabel = input('');
  /** Test id for the action button, so pages keep their own (catalog-retry, empty-add, ...). */
  readonly actionId = input('state-action');
  /** An icon for the action, e.g. `plus`. */
  readonly actionIcon = input<IconName | ''>('');
  /** The screen's main call to action: solid rather than outlined. */
  readonly primaryAction = input(false);
  readonly action = output<void>();

  protected readonly buttonLabel = computed(() =>
    this.state() === 'error' ? 'Retry' : this.state() === 'empty' ? this.actionLabel() : '',
  );
  protected readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);
  protected readonly frame = computed(() => {
    switch (this.state()) {
      case 'error':
        return 'rounded-2xl border border-danger-line bg-danger-soft p-8 text-center';
      case 'empty':
        return 'rounded-2xl border border-dashed border-line-strong bg-card p-8 text-center';
      default:
        return '';
    }
  });
}
