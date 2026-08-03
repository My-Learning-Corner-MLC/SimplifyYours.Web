export const environment = {
  production: false,
  // Served by this app's own nginx container, which proxies /api/* to
  // api-gateway same-origin — no absolute origin needed.
  apiBaseUrl: '',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'https://local.simplifyyours.com/auth/callback',
  oidcScopes: 'openid profile email offline_access',
};
