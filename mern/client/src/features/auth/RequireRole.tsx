import { Outlet } from 'react-router';

import type { Role } from './AuthProvider';

/** Stub until the M4 step 3 implementation. */
export function RequireRole(_props: { role: Role }) {
  return <Outlet />;
}
