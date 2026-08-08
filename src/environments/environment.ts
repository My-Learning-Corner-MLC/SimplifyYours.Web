export const environment = {
  production: true,
  apiBaseUrl: 'TODO: set production api-gateway origin',
  // Hosted sign-in UI (server-rendered by identity-service) is reached
  // directly, not proxied through apiBaseUrl -- see oidc-redirect.service.ts.
  identityHostedUiBaseUrl: 'TODO: set production identity-service origin',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'TODO: set production redirect uri',
  oidcScopes: 'openid profile email offline_access',
};
