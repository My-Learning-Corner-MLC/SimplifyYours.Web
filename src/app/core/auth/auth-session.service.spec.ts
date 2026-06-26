import { isSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be provided in root', () => {
    const service = TestBed.inject(AuthSessionService);
    expect(service).toBeTruthy();
    // Angular Ivy attaches provider metadata to ɵprov; providedIn === 'root' confirms tree-shakable root scope.
    const prov = (AuthSessionService as unknown as { ɵprov: { providedIn: string } }).ɵprov;
    expect(prov.providedIn).toBe('root');
  });

  it('should expose a session signal that returns null by default', () => {
    const service = TestBed.inject(AuthSessionService);
    expect(isSignal(service.session)).toBe(true);
    expect(service.session()).toBeNull();
  });
});
