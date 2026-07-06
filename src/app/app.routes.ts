import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'create-event',
    loadComponent: () =>
      import('./pages/create-event/create-event-page').then((m) => m.CreateEventPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback-page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/sign-up/sign-up-page').then((m) => m.SignUpPage),
  },
  { path: '**', redirectTo: 'dashboard' },
];
