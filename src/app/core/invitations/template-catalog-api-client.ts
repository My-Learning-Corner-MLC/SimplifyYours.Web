import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ListTemplatesError, PreviewToken, TemplateCatalogItem } from './template-catalog.model';

/**
 * Reads the system-wide invitation template catalog from `template-management-service`, and drives
 * its own template preview — issuing a preview token and building the render URL an `<iframe>`
 * loads directly are both this service's concern now, not guest-management-service's. Previewing a
 * template never depends on it being chosen for any event.
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

  /**
   * Issues a short-lived preview token for a template — any active one, whether or not it has
   * ever been chosen for an event. Authenticated (the interceptor attaches the bearer token for
   * every `/api/v1/templates` call); the render itself, below, is not.
   */
  issuePreviewToken(templateId: string): Observable<PreviewToken> {
    return this.http
      .post<PreviewToken>(
        `${environment.apiBaseUrl}/api/v1/templates/${encodeURIComponent(templateId)}/preview-token`,
        {},
      )
      .pipe(catchError((error: unknown) => throwError(() => toListTemplatesError(error))));
  }

  /**
   * The URL the organiser's preview `<iframe>` loads. Not fetched here — the browser requests it
   * directly, anonymously; a preview never carries a bearer token or resolves real event/guest
   * data, only fixed sample content.
   */
  previewRenderUrl(token: string, type: 'public' | 'private'): string {
    return `${environment.apiBaseUrl}/api/v1/templates/preview/${encodeURIComponent(token)}/render?type=${type}`;
  }
}

function toListTemplatesError(error: unknown): ListTemplatesError {
  if (error instanceof HttpErrorResponse && error.status === 400) {
    return { reason: 'validation' };
  }

  return { reason: 'network' };
}
