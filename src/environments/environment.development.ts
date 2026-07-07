export const environment = {
  production: false,
  identityBaseUrl: 'https://localhost:15200',
  eventBaseUrl: 'http://localhost:15001',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'http://localhost:4200/auth/callback',
  oidcScopes: 'openid profile email offline_access',
};
