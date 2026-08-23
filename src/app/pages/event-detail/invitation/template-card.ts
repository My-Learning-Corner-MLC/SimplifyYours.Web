import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { eventTypeLabel as formatEventTypeLabel } from '../../../core/events/event-type-display';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import {
  templateThumbnailAccent,
  templateThumbnailBackground,
  templateThumbnailMotif,
} from './template-thumbnail-tokens';

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

  protected readonly accent = computed(() => templateThumbnailAccent(this.template()));
  protected readonly faceBackground = computed(() => templateThumbnailBackground(this.template()));
  protected readonly motif = computed(() => templateThumbnailMotif(this.template()));
  protected readonly eventTypeLabel = computed(() => formatEventTypeLabel(this.template().eventType).toUpperCase());

  protected onActivate(): void {
    this.chosen.emit(this.template());
  }
}
