import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type PanelState = 'loading' | 'empty' | 'error';

/** One loading, empty or error panel for every data view (CLAUDE.md; UI_DESIGN.md States). */
@Component({
  selector: 'app-state-panel',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatePanel {
  readonly state = input.required<PanelState>();
  readonly message = input('');
  readonly actionLabel = input('');
  readonly action = output<void>();
}
