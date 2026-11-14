import { NavLink, Outlet } from 'react-router';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
  }`;

/** The layout every page renders inside: the React Router twin of a component holding `<router-outlet>`. */
export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-semibold">Salary Management</span>
          <nav aria-label="Main">
            <NavLink to="/health" className={linkClass}>
              Health
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
