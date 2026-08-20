/**
 * A catalog entry from `template-management-service`'s `GET /templates` endpoint.
 *
 * Mirrors `TemplateListItemResponse` exactly: `id/name/tone/palette/eventType/currentVersion`.
 * There is deliberately no thumbnail/artwork field in the Phase A catalog contract — the gallery
 * card face is built client-side from `palette`/`tone` rather than an image.
 */
export interface TemplateCatalogItem {
  readonly id: string;
  readonly name: string;
  readonly tone: string | null;
  readonly palette: readonly string[] | null;
  readonly eventType: string;
  readonly currentVersion: number | null;
}

export type ListTemplatesErrorReason = 'network' | 'validation';

export interface ListTemplatesError {
  readonly reason: ListTemplatesErrorReason;
}

/** Response of `POST /templates/{id}/preview-token`. */
export interface PreviewToken {
  readonly token: string;
  readonly expiresAt: string;
}
