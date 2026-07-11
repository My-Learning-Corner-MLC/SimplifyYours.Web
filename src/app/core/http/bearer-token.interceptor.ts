import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../auth/token-storage.service';

export const bearerTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const isAuthenticatedServiceRequest =
    request.url.startsWith(`${environment.eventBaseUrl}/`) ||
    request.url.startsWith(`${environment.guestManagementBaseUrl}/`);
  if (!isAuthenticatedServiceRequest) {
    return next(request);
  }

  const tokens = inject(TokenStorageService).read();
  if (tokens === null) {
    return next(request);
  }

  return next(
    request.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } }),
  );
};
