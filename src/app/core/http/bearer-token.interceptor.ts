import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../auth/token-storage.service';

export const bearerTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(`${environment.eventBaseUrl}/`)) {
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
