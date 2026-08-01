import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY, catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenRefreshService } from '../auth/token-refresh.service';
import { TokenStorageService } from '../auth/token-storage.service';

/**
 * Handles 401s from the event service by attempting a silent refresh and
 * retrying once. If the refresh fails, the request is swallowed with EMPTY
 * rather than surfaced as an error: TokenRefreshService's onFailure callback
 * already clears the session and redirects to sign-in globally, so consumers
 * of event-service calls never need their own unauthorized handling.
 */
export const bearerTokenInterceptor: HttpInterceptorFn = (request, next) => {
  // Event/guest calls need a bearer token; identity calls (sign-up, sign-in,
  // token exchange) are anonymous. Now that everything shares one origin
  // (the gateway), origin alone can't distinguish them -- use path prefix.
  // No trailing slash: createEvent posts to exactly .../api/v1/events with
  // no remainder, which wouldn't match a "/api/v1/events/" prefix.
  const protectedPathPrefixes = [
    `${environment.apiBaseUrl}/api/v1/events`,
    `${environment.apiBaseUrl}/api/v1/guests`,
  ];
  if (!protectedPathPrefixes.some((prefix) => request.url.startsWith(prefix))) {
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
            return EMPTY;
          }
          return next(
            request.clone({ setHeaders: { Authorization: `Bearer ${refreshed.accessToken}` } }),
          );
        }),
      );
    }),
  );
};
