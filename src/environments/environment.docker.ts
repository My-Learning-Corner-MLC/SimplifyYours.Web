export const environment = {
  production: false,
  // Served by this app's own nginx container, which proxies /api/* to
  // api-gateway same-origin — no absolute origin needed.
  apiBaseUrl: '',
  // Hosted sign-in UI (server-rendered by identity-service, own static
  // assets) is reached directly at its own hostname, not proxied through
  // apiBaseUrl/nginx/api-gateway -- a path-rewriting proxy in front of it
  // breaks its root-relative asset links. See oidc-redirect.service.ts.
  identityHostedUiBaseUrl: 'https://identity-local.simplifyyours.com:15200',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'https://local.simplifyyours.com/auth/callback',
  oidcScopes: 'openid profile email offline_access',
};
