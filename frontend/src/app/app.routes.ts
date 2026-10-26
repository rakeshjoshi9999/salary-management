import { Routes } from '@angular/router';

const healthPage = () => import('./health/health-page').then((m) => m.HealthPage);

export const routes: Routes = [
  {
    // Until the Insights dashboard takes over the landing page (7.5).
    path: '',
    loadComponent: healthPage,
    title: 'Salary Management',
  },
  {
    path: 'catalog',
    loadComponent: () => import('./employees/catalog-page').then((m) => m.CatalogPage),
    loadChildren: () => import('./employees/catalog.routes').then((m) => m.drawerRoutes),
    title: 'Catalog · Salary Management',
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
