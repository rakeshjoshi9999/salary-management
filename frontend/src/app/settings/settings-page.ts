import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ReferenceStore } from '../core/reference.store';

/** Settings: the default country for Insights (ADR-028, UI_DESIGN.md). */
@Component({
  selector: 'app-settings-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  constructor() {
    inject(ReferenceStore).load();
  }
}
