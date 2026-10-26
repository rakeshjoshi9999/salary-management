import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

export type PanelState = 'loading' | 'empty' | 'error';

/**
 * One loading, empty or error panel for every data view (CLAUDE.md; UI_DESIGN.md States).
 * Presentational only: the page decides the state and what the action does.
 */
@Component({
  selector: 'app-state-panel',
  imports: [ButtonModule, SkeletonModule],
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
        <p
          [class]="
            state() === 'error' ? 'font-medium text-red-900' : 'font-medium text-surface-900'
          "
        >
          {{ message() }}
        </p>
        @if (detail()) {
          <p
            [class]="
              state() === 'error' ? 'mt-1 text-sm text-red-800' : 'mt-1 text-sm text-surface-600'
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
            @if (actionIcon()) {
              <i [class]="actionIcon() + ' mr-2'" aria-hidden="true"></i>
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
  /** A PrimeIcons class for the action, e.g. `pi pi-plus`. */
  readonly actionIcon = input('');
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
        return 'rounded-md border border-red-200 bg-red-50 p-6 text-center';
      case 'empty':
        return 'rounded-md border border-surface-200 bg-surface-0 p-6 text-center';
      default:
        return '';
    }
  });
}
