import { Outlet } from 'react-router';

export type Role = 'HR_MANAGER' | 'VIEWER';
export interface User {
  id: string;
  role: Role;
}

/** Stub until the M4 step 3 implementation. */
export function AuthRoot() {
  return <Outlet />;
}
