import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { PanelState, StatePanel } from './state-panel';

@Component({
  imports: [StatePanel],
  template: `<app-state-panel [state]="state()" message="Nothing here" actionLabel="Add" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly state = input<PanelState>('empty');
}

/** Empty and error panels lead with an icon (task 8.12); it is decoration, hidden from screen readers. */
describe('StatePanel', () => {
  async function render(state: PanelState): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('state', state);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  for (const state of ['empty', 'error'] as const) {
    it(`shows a decorative icon in the ${state} state`, async () => {
      const el = await render(state);

      const icon = el.querySelector('[data-testid="state-icon"]');
      expect(icon?.querySelector('svg')).toBeTruthy();
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });
  }
});
