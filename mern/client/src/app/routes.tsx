import { redirect, type RouteObject } from 'react-router';

import { HealthPage } from '../features/health/HealthPage';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';

/**
 * The route table, shared by `main.tsx` (browser router) and the tests (memory router). Children render
 * in the shell's `<Outlet />`. `/` points at the health page until the catalog exists; a loader redirects
 * before anything renders, where `<Navigate>` would render first and redirect in an effect.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, loader: () => redirect('/health') },
      { path: 'health', element: <HealthPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
