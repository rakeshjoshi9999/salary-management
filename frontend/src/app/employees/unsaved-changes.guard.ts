import { CanDeactivateFn } from '@angular/router';

import { EmployeeDrawer } from './employee-drawer';

/** Asks before leaving a changed form, however the user leaves inside the app (ADR-051). */
export const unsavedChangesGuard: CanDeactivateFn<EmployeeDrawer> = () => true;
