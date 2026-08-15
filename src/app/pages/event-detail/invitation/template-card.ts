import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';

const FALLBACK_PALETTE: readonly string[] = ['#C98D6B', '#FBF3E8'];

/**
 * One card in the gallery grid.
 *
 * The Phase A catalog (`template-management-service`'s `GET /templates`) returns
 * `id/name/tone/palette/eventType/currentVersion` — no thumbnail or artwork field. Rather than
 * reverse-engineer the mockup's bespoke per-template illustrations, the card face is built here
 * from the template's own `palette` swatches: a soft gradient plus the template's initial as a
 * watermark. When the catalog eventually grows a thumbnail URL, only this face needs to change —
 * everything else about the card (name, arrow, selected state) stays the same.
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

  protected readonly faceGradient = computed(() => {
    const colours = this.palette();
    const stops = colours.length > 1 ? colours : [colours[0], colours[0]];
    return `linear-gradient(160deg, ${stops.join(', ')})`;
  });

  protected readonly initial = computed(() => this.template().name.trim().charAt(0).toUpperCase() || '?');

  protected onActivate(): void {
    this.chosen.emit(this.template());
  }
}
