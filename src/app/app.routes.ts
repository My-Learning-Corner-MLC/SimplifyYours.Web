import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/sign-up/sign-up-page').then((m) => m.SignUpPage),
  },
  { path: '**', redirectTo: 'dashboard' },
];
