export const environment = {
  production: false,
  identityServerOrigin: 'http://localhost:15201',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'http://localhost:4200/auth/callback',
  oidcScopes: 'openid profile email offline_access',
};
