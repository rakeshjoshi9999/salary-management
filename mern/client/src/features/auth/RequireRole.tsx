import { Outlet } from 'react-router';

import { useAuth, type Role } from './AuthProvider';

/** Only `role` sees the children. UX only: the server's `authorize` is the real check. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();

  if (user?.role === role) {
    return <Outlet />;
  }
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Not allowed</h1>
      <p className="text-slate-600">Your role cannot open this page.</p>
    </section>
  );
}
