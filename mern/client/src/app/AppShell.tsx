import { Link, NavLink, Outlet } from 'react-router';

import { useAuth, type Role } from '../features/auth/AuthProvider';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
  }`;

const ROLE_LABEL: Record<Role, string> = { HR_MANAGER: 'HR manager', VIEWER: 'Viewer' };

/** The layout every page renders inside: the React Router twin of a component holding `<router-outlet>`. */
export function AppShell() {
  const { status, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-semibold">Salary Management</span>
          {status === 'authenticated' && (
            <nav aria-label="Main" className="flex gap-1">
              <NavLink to="/" end className={linkClass}>
                Insights
              </NavLink>
              <NavLink to="/catalog" className={linkClass}>
                Catalog
              </NavLink>
            </nav>
          )}
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="text-slate-600">{ROLE_LABEL[user.role]}</span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-md border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" className="font-medium text-blue-700 underline">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
