import { Routes } from '@angular/router';

const healthPage = () => import('./health/health-page').then((m) => m.HealthPage);

export const routes: Routes = [
  {
    // The landing page is the Insights dashboard (ADR-027). Lazy, so Chart.js stays out of the
    // initial bundle.
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./insights/insights-page').then((m) => m.InsightsPage),
    title: 'Insights · Salary Management',
  },
  {
    path: 'catalog',
    loadComponent: () => import('./employees/catalog-page').then((m) => m.CatalogPage),
    loadChildren: () => import('./employees/catalog.routes').then((m) => m.drawerRoutes),
    title: 'Catalog · Salary Management',
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings-page').then((m) => m.SettingsPage),
    title: 'Settings · Salary Management',
  },
  {
    // Phase 1 health page: not in the top bar; the README links it (ADR-051).
    path: 'health',
    loadComponent: healthPage,
    title: 'Health · Salary Management',
  },
  // An unknown address lands on the landing page instead of an uncaught navigation error.
  { path: '**', redirectTo: '' },
];
