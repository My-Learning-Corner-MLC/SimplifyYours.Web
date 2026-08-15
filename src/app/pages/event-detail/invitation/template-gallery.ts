import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { eventTypeLabel } from '../../../core/events/event-type-display';
import { InvitationSelectionService } from '../../../core/invitations/invitation-selection.service';
import { TemplateCatalogApiClient } from '../../../core/invitations/template-catalog-api-client';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { TemplateCard } from './template-card';

type CatalogState = 'loading' | 'error' | 'ready';

/**
 * The Invitations tab's landing view: every template available for this event's type, laid out as
 * a grid of {@link TemplateCard}s.
 *
 * Reads the "currently selected" state from {@link InvitationSelectionService} rather than fetching
 * it independently, so the summary bar here and the Guests tab's toolbar note can never disagree —
 * see the service's doc comment for why that matters.
 */
@Component({
  selector: 'app-template-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TemplateCard],
  templateUrl: './template-gallery.html',
  styleUrl: './template-gallery.scss',
})
export class TemplateGallery {
  private readonly api = inject(TemplateCatalogApiClient);
  protected readonly selection = inject(InvitationSelectionService);

  readonly eventType = input.required<string>();

  readonly templateChosen = output<TemplateCatalogItem>();
  /** Emits the currently-selected template — the summary bar only shows once one is resolved. */
  readonly viewDetail = output<TemplateCatalogItem>();
  readonly editBasicInfo = output<void>();

  protected readonly catalogState = signal<CatalogState>('loading');
  protected readonly templates = signal<readonly TemplateCatalogItem[]>([]);

  protected readonly eventTypeLabel = computed(() => eventTypeLabel(this.eventType()));

  /** `repeat(2, minmax(0,300px))` for two templates; otherwise one column per template, capped at 3. */
  protected readonly gridColumns = computed(() => {
    const count = this.templates().length;
    return `repeat(${Math.max(1, Math.min(count, 3))}, minmax(0, 300px))`;
  });

  protected readonly selectedTemplateId = computed(() => this.selection.settings()?.templateId ?? null);

  protected readonly selectedTemplateName = computed(() => {
    const id = this.selectedTemplateId();
    if (!id) {
      return null;
    }
    return this.templates().find((t) => t.id === id)?.name ?? null;
  });

  constructor() {
    // Keyed on the eventType input rather than run once, so a signal-set input value (available
    // only after the view is created, not in the constructor body) still triggers the first load.
    effect(() => this.load(this.eventType()));
  }

  retry(): void {
    this.load(this.eventType());
  }

  private load(eventType: string): void {
    this.catalogState.set('loading');

    this.api.listTemplates(eventType).subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.catalogState.set('ready');
      },
      error: () => this.catalogState.set('error'),
    });
  }

  protected onChosen(template: TemplateCatalogItem): void {
    this.templateChosen.emit(template);
  }

  protected onViewDetail(): void {
    const id = this.selectedTemplateId();
    const template = id ? this.templates().find((t) => t.id === id) : undefined;

    if (template) {
      this.viewDetail.emit(template);
    }
  }

  protected onEditBasicInfo(): void {
    this.editBasicInfo.emit();
  }

  protected trackById(_index: number, template: TemplateCatalogItem): string {
    return template.id;
  }
}
