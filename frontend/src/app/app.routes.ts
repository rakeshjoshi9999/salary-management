import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // Lazy even though there is one route: the pattern that will matter when
    // employees/ and insights/ arrive should be in place from the start.
    loadComponent: () => import('./health/health-page').then((m) => m.HealthPage),
    title: 'Salary Management',
  },
];
