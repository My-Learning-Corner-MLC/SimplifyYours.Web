import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { routes } from './app.routes';

describe('app routes', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should redirect "/" to "/dashboard"', async () => {
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    await router.navigate(['/']);
    expect(location.path()).toBe('/dashboard');
  });

  it('should redirect unknown paths to "/dashboard"', async () => {
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    await router.navigate(['/unknown-route']);
    expect(location.path()).toBe('/dashboard');
  });

  it('declares an /auth/callback route before the wildcard', () => {
    const callbackIndex = routes.findIndex((r) => r.path === 'auth/callback');
    const wildcardIndex = routes.findIndex((r) => r.path === '**');
    expect(callbackIndex).toBeGreaterThanOrEqual(0);
    expect(wildcardIndex).toBeGreaterThan(callbackIndex);
  });
});
