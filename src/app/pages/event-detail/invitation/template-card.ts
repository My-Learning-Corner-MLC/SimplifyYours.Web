import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { eventTypeLabel as formatEventTypeLabel } from '../../../core/events/event-type-display';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';

const FALLBACK_PALETTE: readonly string[] = ['#C98D6B', '#FBF3E8'];
const DEFAULT_FACE_BACKGROUND = '#F7F0E6';

export type TemplateCardMotif = 'rings' | 'balloon' | 'toast' | 'rocket' | 'plate' | 'spark';

const MOTIF_BY_EVENT_TYPE: Readonly<Record<string, TemplateCardMotif>> = {
  wedding: 'rings',
  birthday: 'balloon',
  anniversary: 'toast',
  launch: 'rocket',
  dinner: 'plate',
};

/**
 * One card in the gallery grid.
 *
 * The Phase A catalog (`template-management-service`'s `GET /templates`) returns
 * `id/name/tone/palette/eventType/currentVersion` — no thumbnail or artwork field. Rather than
 * reverse-engineer the mockup's bespoke per-template illustrations, the card face follows the
 * mockup's own "generic thumbnail" system instead: an inset frame, an event-type label, a motif
 * icon, and a closing rule, all colored from the template's own `palette` swatches. When the
 * catalog eventually grows a thumbnail URL, only this face needs to change.
 */
@Component({
  selector: 'app-template-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-card.html',
  styleUrl: './template-card.scss',
})
export class TemplateCard {
  readonly template = input.required<TemplateCatalogItem>();
  readonly selected = input<boolean>(false);

  readonly chosen = output<TemplateCatalogItem>();

  protected readonly palette = computed(() => {
    const colours = this.template().palette;
    return colours && colours.length > 0 ? colours : FALLBACK_PALETTE;
  });

  protected readonly accent = computed(() => this.palette()[0]);

  protected readonly faceBackground = computed(() => {
    const colours = this.palette();
    return colours.length > 1 ? colours[1] : DEFAULT_FACE_BACKGROUND;
  });

  protected readonly eventTypeLabel = computed(() => formatEventTypeLabel(this.template().eventType).toUpperCase());

  protected readonly motif = computed<TemplateCardMotif>(
    () => MOTIF_BY_EVENT_TYPE[this.template().eventType?.trim().toLowerCase()] ?? 'spark',
  );

  protected onActivate(): void {
    this.chosen.emit(this.template());
  }
}
