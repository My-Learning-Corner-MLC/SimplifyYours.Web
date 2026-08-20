import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';

const FALLBACK_PALETTE: readonly string[] = ['#C98D6B', '#FBF3E8'];
const DEFAULT_FACE_BACKGROUND = '#F7F0E6';

export type TemplateThumbnailMotif = 'rings' | 'balloon' | 'toast' | 'rocket' | 'plate' | 'spark';

const MOTIF_BY_EVENT_TYPE: Readonly<Record<string, TemplateThumbnailMotif>> = {
  wedding: 'rings',
  birthday: 'balloon',
  anniversary: 'toast',
  launch: 'rocket',
  dinner: 'plate',
};

/**
 * Palette-derived tokens for the mockup's "generic thumbnail" face — an inset frame, event-type
 * label, motif icon, and closing rule, all colored from the template's own `palette` swatches.
 * Shared by the gallery card and the template-detail view, which both render this same face.
 */
export function templateThumbnailPalette(template: TemplateCatalogItem): readonly string[] {
  const colours = template.palette;
  return colours && colours.length > 0 ? colours : FALLBACK_PALETTE;
}

export function templateThumbnailAccent(template: TemplateCatalogItem): string {
  return templateThumbnailPalette(template)[0];
}

export function templateThumbnailBackground(template: TemplateCatalogItem): string {
  const colours = templateThumbnailPalette(template);
  return colours.length > 1 ? colours[1] : DEFAULT_FACE_BACKGROUND;
}

export function templateThumbnailMotif(template: TemplateCatalogItem): TemplateThumbnailMotif {
  return MOTIF_BY_EVENT_TYPE[template.eventType?.trim().toLowerCase()] ?? 'spark';
}
