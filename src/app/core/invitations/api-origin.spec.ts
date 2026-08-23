import { apiOrigin } from './api-origin';

describe('apiOrigin', () => {
  it('returns the origin of an absolute base URL', () => {
    expect(apiOrigin('https://api.example.test:8443/base')).toBe('https://api.example.test:8443');
  });

  it('falls back to window.location.origin for a relative base URL', () => {
    expect(apiOrigin('/api')).toBe(window.location.origin);
  });
});
