import { Navigate, Outlet, useSearchParams } from 'react-router';

import { useAuth } from './AuthProvider';
import { safeFrom } from './safeFrom';

/**
 * The mirror of RequireAuth, around the login and register pages. It is also how a successful sign-in
 * leaves the login page: the status turns authenticated and this sends the user to `from`.
 */
export function GuestOnly() {
  const { status } = useAuth();
  const [params] = useSearchParams();

  if (status === 'authenticated') {
    return <Navigate to={safeFrom(params.get('from'))} replace />;
  }
  return <Outlet />;
}
