import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from './AuthProvider';

/** The `canActivate` of this app: a layout route that renders its children or sends the user to log in. */
export function RequireAuth() {
  const { status, expired } = useAuth();
  const location = useLocation();

  if (status === 'authenticated') {
    return <Outlet />;
  }
  const params = new URLSearchParams({ from: location.pathname + location.search });
  if (expired) {
    params.set('reason', 'expired');
  }
  // `replace`: the refused URL leaves history, so Back does not loop into this guard.
  return <Navigate to={`/login?${params.toString()}`} replace />;
}
