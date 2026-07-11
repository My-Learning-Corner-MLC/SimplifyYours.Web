export const environment = {
  production: false,
  identityBaseUrl: 'https://localhost:15200',
  eventBaseUrl: 'https://localhost:15000',
  guestManagementBaseUrl: 'https://localhost:15300',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'http://localhost:4200/auth/callback',
  oidcScopes: 'openid profile email offline_access',
};
