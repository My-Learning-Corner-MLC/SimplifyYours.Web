export const environment = {
  production: false,
  // Native `dotnet run --launch-profile https` default for api-gateway.
  // Running the full containerized stack via code/infra/local-dev instead?
  // Use https://localhost:5443.
  apiBaseUrl: 'https://localhost:7144',
  oidcClientId: 'simplify-yours-web',
  oidcRedirectUri: 'http://localhost:4200/auth/callback',
  oidcScopes: 'openid profile email offline_access',
};
