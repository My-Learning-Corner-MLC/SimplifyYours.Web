export const environment = {
  production: false,
  // Native `dotnet run --launch-profile https` default for api-gateway.
  // Running the full containerized stack via code/infra/local-dev instead?
  // Use https://localhost:5443.
  apiBaseUrl: 'https://localhost:7144',
  // Hosted sign-in UI is reached directly at identity-service's own origin,
  // not proxied through apiBaseUrl -- see oidc-redirect.service.ts. Native
  // `dotnet run --launch-profile https` default port for identity-service.
  identityHostedUiBaseUrl: 'https://localhost:15200',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'http://localhost:4200/auth/callback',
  oidcScopes: 'openid profile email offline_access',
};
