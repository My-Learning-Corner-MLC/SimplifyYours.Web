import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenRefreshService } from '../auth/token-refresh.service';
import { TokenStorageService } from '../auth/token-storage.service';

export const bearerTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const protectedOrigins = [environment.eventBaseUrl, environment.guestManagementBaseUrl];
  if (!protectedOrigins.some((origin) => request.url.startsWith(`${origin}/`))) {
    return next(request);
  }

  const tokenStorage = inject(TokenStorageService);
  const tokenRefresh = inject(TokenRefreshService);

  const tokens = tokenStorage.read();
  const authorizedRequest =
    tokens === null
      ? request
      : request.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } });

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return from(tokenRefresh.ensureFreshToken()).pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            return throwError(() => error);
          }
          return next(
            request.clone({ setHeaders: { Authorization: `Bearer ${refreshed.accessToken}` } }),
          );
        }),
      );
    }),
  );
};
