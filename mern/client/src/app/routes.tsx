import type { RouteObject } from 'react-router';

import { AuthRoot } from '../features/auth/AuthProvider';
import { GuestOnly } from '../features/auth/GuestOnly';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { InsightsPage } from '../features/insights/InsightsPage';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';

/**
 * The route table, shared by `main.tsx` (browser router) and the tests (memory router). Layout routes
 * (no `path`) wrap their children: AuthRoot restores the session, AppShell draws the page, and the
 * guards decide who gets in. Home is Insights. Public: not-found. Guest-only: login, register.
 */
export const routes: RouteObject[] = [
  {
    element: <AuthRoot />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          {
            element: <RequireAuth />,
            children: [
              { index: true, element: <InsightsPage /> },
              { path: 'catalog', element: <CatalogPage /> },
            ],
          },
          {
            element: <GuestOnly />,
            children: [
              { path: 'login', element: <LoginPage /> },
              { path: 'register', element: <RegisterPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
