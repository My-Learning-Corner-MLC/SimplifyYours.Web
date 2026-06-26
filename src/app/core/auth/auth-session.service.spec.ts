import { TestBed } from '@angular/core/testing';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be provided in root', () => {
    const service = TestBed.inject(AuthSessionService);
    expect(service).toBeTruthy();
  });

  it('should expose a session signal that returns null by default', () => {
    const service = TestBed.inject(AuthSessionService);
    expect(service.session()).toBeNull();
  });
});
