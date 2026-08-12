import { Routes } from '@angular/router';

import { authenticatedGuard } from './core/auth/authenticated.guard';
import { guestGuard } from './core/auth/guest.guard';
import { createEventLeaveGuard } from './pages/create-event/create-event-leave.guard';

// `home` is the sole default/fallback target for both '' and '**'. It carries
// `guestGuard`, so an authenticated user landing here is bounced onward to
// `/dashboard` automatically — one redirect chain covers both the "default
// route" and "invalid route" requirements for each auth state.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard-page').then((m) => m.DashboardPage),
    canActivate: [authenticatedGuard],
  },
  {
    path: 'create-event',
    loadComponent: () =>
      import('./pages/create-event/create-event-page').then((m) => m.CreateEventPage),
    canActivate: [authenticatedGuard],
    canDeactivate: [createEventLeaveGuard],
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./pages/event-detail/event-detail-page').then((m) => m.EventDetailPage),
    canActivate: [authenticatedGuard],
  },
  {
    // Public: a guest opening their link has no account and must never hit an auth guard.
    // Registered before the '**' fallback so the wildcard cannot swallow it.
    path: 'invitation/:token',
    loadComponent: () =>
      import('./pages/invitation/invitation-page').then((m) => m.InvitationPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./pages/auth-callback/auth-callback-page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/sign-up/sign-up-page').then((m) => m.SignUpPage),
    canActivate: [guestGuard],
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/static-page/static-page').then((m) => m.StaticPage),
    canActivate: [guestGuard],
    data: {
      title: 'Home',
      text: 'Welcome to SimplifyYours — the simple way to plan your next event.',
    },
  },
  {
    path: 'blogs',
    loadComponent: () => import('./pages/static-page/static-page').then((m) => m.StaticPage),
    canActivate: [guestGuard],
    data: {
      title: 'Blogs',
      text: 'Stories, tips, and inspiration for your next occasion. Coming soon.',
    },
  },
  {
    path: 'pricing',
    loadComponent: () => import('./pages/static-page/static-page').then((m) => m.StaticPage),
    canActivate: [guestGuard],
    data: {
      title: 'Pricing',
      text: 'Simple, transparent plans for every kind of event. Coming soon.',
    },
  },
  {
    path: 'how-it-works',
    loadComponent: () => import('./pages/static-page/static-page').then((m) => m.StaticPage),
    canActivate: [guestGuard],
    data: {
      title: 'How it works',
      text: 'From idea to invitation in a few simple steps.',
    },
  },
  {
    path: 'about-us',
    loadComponent: () => import('./pages/static-page/static-page').then((m) => m.StaticPage),
    canActivate: [guestGuard],
    data: {
      title: 'About Us',
      text: "We're building the easiest way to plan memorable occasions.",
    },
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/static-page/static-page').then((m) => m.StaticPage),
    canActivate: [authenticatedGuard],
    data: {
      title: 'Events',
      text: 'Manage every occasion you’re planning, all in one place. Coming soon.',
    },
  },
  {
    path: 'tasks',
    loadComponent: () => import('./pages/static-page/static-page').then((m) => m.StaticPage),
    canActivate: [authenticatedGuard],
    data: {
      title: 'Tasks',
      text: 'Keep track of everything that needs doing before the big day. Coming soon.',
    },
  },
  {
    path: 'vendors',
    loadComponent: () => import('./pages/static-page/static-page').then((m) => m.StaticPage),
    canActivate: [authenticatedGuard],
    data: {
      title: 'Vendors',
      text: 'Find and manage the people and places that bring your event to life. Coming soon.',
    },
  },
  { path: '**', redirectTo: 'home' },
];
