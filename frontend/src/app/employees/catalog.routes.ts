import { Routes } from '@angular/router';

import { EmployeeDrawer } from './employee-drawer';
import { unsavedChangesGuard } from './unsaved-changes.guard';

/** The drawer's routes, as children of `/catalog` so the list stays behind them (UI_DESIGN.md). */
export const drawerRoutes: Routes = [
  {
    path: 'new',
    component: EmployeeDrawer,
    data: { mode: 'add' },
    canDeactivate: [unsavedChangesGuard],
  },
  { path: ':id', component: EmployeeDrawer, data: { mode: 'view' } },
  {
    path: ':id/edit',
    component: EmployeeDrawer,
    data: { mode: 'edit' },
    canDeactivate: [unsavedChangesGuard],
  },
];
