import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ReferenceStore } from '../core/reference.store';

/** The Insights dashboard, the landing page (UI_DESIGN.md, ADR-027). */
@Component({
  selector: 'app-insights-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage {
  constructor() {
    inject(ReferenceStore).load();
  }
}
