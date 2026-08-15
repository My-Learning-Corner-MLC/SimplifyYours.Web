import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ListTemplatesError, TemplateCatalogItem } from './template-catalog.model';

/**
 * Reads the system-wide invitation template catalog from `template-management-service`.
 *
 * Routed through the gateway at `/api/v1/templates` (see api-gateway's `appsettings.json`
 * `TemplateRoute`). The list endpoint's contract is a bare JSON array, not an `{ templates: [] }`
 * envelope — see `TemplateEndpoints.ListTemplatesAsync` on the backend.
 */
@Injectable({ providedIn: 'root' })
export class TemplateCatalogApiClient {
  private readonly http = inject(HttpClient);

  listTemplates(eventType: string): Observable<readonly TemplateCatalogItem[]> {
    const params = new HttpParams().set('eventType', eventType);

    return this.http
      .get<readonly TemplateCatalogItem[]>(`${environment.apiBaseUrl}/api/v1/templates`, { params })
      .pipe(
        map((items) => items ?? []),
        catchError((error: unknown) => throwError(() => toListTemplatesError(error))),
      );
  }
}

function toListTemplatesError(error: unknown): ListTemplatesError {
  if (error instanceof HttpErrorResponse && error.status === 400) {
    return { reason: 'validation' };
  }

  return { reason: 'network' };
}
