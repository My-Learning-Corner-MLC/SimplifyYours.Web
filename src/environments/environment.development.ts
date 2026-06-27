export const environment = {
  production: false,
  identityServerOrigin: 'https://localhost:15200',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'http://localhost:4200/auth/callback',
  oidcScopes: 'openid profile email offline_access',
};
