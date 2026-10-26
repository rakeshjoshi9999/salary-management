import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ReferenceStore } from '../core/reference.store';

export type DrawerMode = 'view' | 'add' | 'edit';

/** The employee drawer over the Catalog: view, add and edit (UI_DESIGN.md). */
@Component({
  selector: 'app-employee-drawer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeDrawer {
  constructor() {
    inject(ReferenceStore).load();
  }

  /** Used by the unsaved-changes guard. */
  canLeave(): boolean | Promise<boolean> {
    return true;
  }
}
