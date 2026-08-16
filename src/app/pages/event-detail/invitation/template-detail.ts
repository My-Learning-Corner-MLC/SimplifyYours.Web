import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { environment } from '../../../../environments/environment';
import { apiOrigin } from '../../../core/invitations/api-origin';
import { InvitationApiClient } from '../../../core/invitations/invitation-api-client';
import { InvitationSelectionService } from '../../../core/invitations/invitation-selection.service';
import { InvitationSettingsApiClient } from '../../../core/invitations/invitation-settings-api-client';
import { PreviewToken } from '../../../core/invitations/invitation-settings.model';
import { eventTypeLabel } from '../../../core/events/event-type-display';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { PreviewLinkType, TemplatePreviewFrame } from './template-preview-frame';

type TokenState = 'loading' | 'ready' | 'error';

/**
 * One template's detail/preview view: breadcrumb back to the gallery, a live sandboxed preview of
 * the template rendered with sample data, and the guest-link/public-link switch.
 *
 * A preview token is issued once, on mount — not per switch flip — and both link types are built
 * from the same token by varying the render endpoint's `type` query param, per
 * `ResolveInvitationRenderQueryHandler`'s preview-token branch.
 */
@Component({
  selector: 'app-template-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TemplatePreviewFrame],
  templateUrl: './template-detail.html',
  styleUrl: './template-detail.scss',
})
export class TemplateDetail {
  private readonly settingsApi = inject(InvitationSettingsApiClient);
  private readonly invitationApi = inject(InvitationApiClient);
  private readonly selection = inject(InvitationSelectionService);

  readonly template = input.required<TemplateCatalogItem>();
  readonly eventId = input.required<string>();
  readonly eventType = input.required<string>();
  readonly isPublicLinkEnabled = input<boolean>(false);

  readonly back = output<void>();
  /** Fires for both "Use this template" (not yet selected) and "Edit basic info" (already selected). */
  readonly useTemplate = output<void>();

  /** Drives the SELECTED badge and swaps the footer's primary action to "Edit basic info". */
  protected readonly isSelected = computed(() => this.template().id === this.selection.settings()?.templateId);

  protected readonly linkType = signal<PreviewLinkType>('private');
  protected readonly tokenState = signal<TokenState>('loading');
  private readonly previewToken = signal<PreviewToken | null>(null);

  protected readonly eventTypeLabel = computed(() => eventTypeLabel(this.eventType()));
  protected readonly apiOrigin = apiOrigin(environment.apiBaseUrl);

  protected readonly previewSrc = computed(() => {
    const token = this.previewToken();
    return token ? this.invitationApi.previewRenderUrl(token.token, this.linkType()) : null;
  });

  protected readonly caption = computed(() =>
    this.linkType() === 'private'
      ? // The rendered preview reuses the same guest markup as a real invitation, sample name and
        // all — the RSVP button really is there, it just does nothing here rather than being
        // hidden outright.
        'This preview shows exactly what a guest would see, including a sample name. The RSVP button is inert in this preview.'
      : "This is what anyone with the public link would see — no guest name attached. The RSVP button is inert in this preview.",
  );

  constructor() {
    // Keyed on eventId so it re-issues if the detail view is reused for a different event; issued
    // once per mount, not on every link-type flip — both link types read from the same token.
    effect(() => this.issueToken(this.eventId()));
  }

  private issueToken(eventId: string): void {
    this.tokenState.set('loading');
    this.previewToken.set(null);

    this.settingsApi.issuePreviewToken(eventId).subscribe({
      next: (token) => {
        this.previewToken.set(token);
        this.tokenState.set('ready');
      },
      error: () => this.tokenState.set('error'),
    });
  }

  protected retryToken(): void {
    this.issueToken(this.eventId());
  }

  protected setLinkType(type: PreviewLinkType): void {
    if (type === 'public' && !this.isPublicLinkEnabled()) {
      return;
    }
    this.linkType.set(type);
  }

  protected onBack(): void {
    this.back.emit();
  }

  protected onUseTemplate(): void {
    this.useTemplate.emit();
  }
}
