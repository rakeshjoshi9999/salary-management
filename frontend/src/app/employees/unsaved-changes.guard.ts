import { CanDeactivateFn } from '@angular/router';

import { EmployeeDrawer } from './employee-drawer';

/**
 * Asks before leaving a changed form, however the user leaves inside the app: the drawer's buttons,
 * the top bar, Back, or another row (ADR-051). Closing the tab is not covered.
 */
export const unsavedChangesGuard: CanDeactivateFn<EmployeeDrawer> = (drawer) => drawer.canLeave();
