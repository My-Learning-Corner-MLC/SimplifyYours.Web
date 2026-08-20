import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { GuestApiClient } from '../../../core/guests/guest-api-client';
import { InvitationSelectionService } from '../../../core/invitations/invitation-selection.service';
import { InvitationSettingsApiClient } from '../../../core/invitations/invitation-settings-api-client';
import { InvitationError } from '../../../core/invitations/invitation.model';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { BasicInfoForm, BasicInfoSaveEvent } from './basic-info-form';
import { ChangeTemplateConfirmDialog } from './change-template-confirm-dialog';
import { TemplateDetail } from './template-detail';
import { TemplateGallery } from './template-gallery';
import { UseTemplateConfirmDialog } from './use-template-confirm-dialog';

type View = 'gallery' | 'detail' | 'basic-info';
type PendingDialog = 'use' | 'change' | null;

/**
 * The Invitations tab's top-level container: owns navigation between the gallery, a template's
 * detail/preview, and the basic-info page, and wires the confirm dialogs to the actual save call.
 *
 * "Use this template" (a new selection) and "Edit basic info" (an already-applied one) both go
 * straight from the detail view to the basic-info page — nothing is saved yet. Save on that page
 * validates the form, then opens the same "Use this template?"/"Change template?" dialog as
 * before; confirming it is what actually persists the template choice and the field values
 * together, in one call.
 *
 * "≥1 guest already has an invitation link" is approximated here as "≥1 guest exists": every guest
 * gets a copyable invitation link the moment they are added (see `GuestApiClient.getInvitationLink`
 * and the Guests tab's "Copy link" button), independent of whether anything was ever sent through
 * `notification-service` — there is no separate "link issued" flag on `Guest` to check instead.
 *
 * TODO(slice-3): no `SendInvitationsButton`/`SendInvitationsConfirmDialog` here on purpose.
 * `notification-service` does not exist yet, so there is nothing for a "Send invitations" action to
 * call — an organiser can copy each guest's link by hand from the Guests tab today. Wire this up
 * once that service ships rather than shipping a button that looks actionable and silently fails.
 */
@Component({
  selector: 'app-invitations-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TemplateGallery, TemplateDetail, BasicInfoForm, UseTemplateConfirmDialog, ChangeTemplateConfirmDialog],
  templateUrl: './invitations-tab.html',
  styleUrl: './invitations-tab.scss',
})
export class InvitationsTab {
  private readonly guestApi = inject(GuestApiClient);
  private readonly settingsApi = inject(InvitationSettingsApiClient);
  protected readonly selection = inject(InvitationSelectionService);

  readonly eventId = input.required<string>();
  readonly eventType = input.required<string>();
  readonly eventName = input.required<string>();

  /**
   * Fires once, right after a template selection is actually saved — not on every render — so the
   * Guests tab toolbar can announce it via a single `aria-live="polite"` region instead of one that
   * re-announces on every unrelated change to shared selection state.
   */
  readonly templateSelected = output<string>();

  /**
   * The extra breadcrumb segments (e.g. "Invitations", "Verona", "Basic info") for whatever this
   * tab is currently showing — `EventDetailPage` appends them to its own "Events › {name}" trail
   * instead of this tab drawing a second breadcrumb bar of its own.
   */
  readonly breadcrumbChange = output<readonly string[]>();

  protected readonly view = signal<View>('gallery');
  protected readonly detailTemplate = signal<TemplateCatalogItem | null>(null);
  protected readonly pendingDialog = signal<PendingDialog>(null);
  protected readonly savingSelection = signal(false);
  protected readonly selectionError = signal<string | null>(null);
  protected readonly basicInfoServerErrors = signal<Readonly<Record<string, readonly string[]>>>({});

  /** Captured from the basic-info page's Save, held until the confirm dialog is actually confirmed. */
  private pendingSave: BasicInfoSaveEvent | null = null;

  /**
   * Best-effort guest count for the confirm-dialog decision and the basic-info form's "already
   * sent" warning. A failed fetch falls back to 0 (the more permissive "Use this template" dialog)
   * rather than blocking the flow outright — see the class remarks for why the underlying signal
   * cannot be exact anyway.
   */
  protected readonly guestCount = signal(0);

  private readonly breadcrumbSegments = computed<readonly string[]>(() => {
    const template = this.detailTemplate();
    if (!template) {
      return ['Invitations'];
    }
    return this.view() === 'basic-info'
      ? ['Invitations', template.name, 'Basic info']
      : ['Invitations', template.name];
  });

  constructor() {
    effect(() => {
      const eventId = this.eventId();
      this.selection.load(eventId);
      this.guestApi.listGuests(eventId).subscribe({
        next: (guests) => this.guestCount.set(guests.length),
        error: () => this.guestCount.set(0),
      });
    });

    effect(() => this.breadcrumbChange.emit(this.breadcrumbSegments()));
  }

  protected onTemplateChosen(template: TemplateCatalogItem): void {
    this.detailTemplate.set(template);
    this.view.set('detail');
  }

  protected onGalleryViewDetail(template: TemplateCatalogItem): void {
    this.detailTemplate.set(template);
    this.view.set('detail');
  }

  protected onDetailBack(): void {
    this.detailTemplate.set(null);
    this.view.set('gallery');
  }

  /** "Use this template" (new selection) or "Edit basic info" (already selected) — same next step. */
  protected onDetailProceed(): void {
    this.view.set('basic-info');
  }

  protected onBasicInfoSave(event: BasicInfoSaveEvent): void {
    this.pendingSave = event;
    this.selectionError.set(null);
    this.pendingDialog.set(this.guestCount() > 0 ? 'change' : 'use');
  }

  protected onBasicInfoDismissed(): void {
    // Cancel / "Back to preview" return to the detail view they were reached from — not the
    // gallery — so the organiser lands back on the preview, not further away from it.
    this.view.set('detail');
  }

  protected onDialogCancelled(): void {
    this.pendingDialog.set(null);
  }

  protected onDialogConfirmed(): void {
    const template = this.detailTemplate();
    const pending = this.pendingSave;

    if (!template || !pending) {
      return;
    }

    this.savingSelection.set(true);
    this.selectionError.set(null);

    this.settingsApi
      .saveSettings(this.eventId(), {
        templateId: template.id,
        fieldValues: pending.fieldValues,
        publicLinkEnabled: pending.publicLinkEnabled,
      })
      .subscribe({
        next: (settings) => {
          this.selection.applySaved(settings);
          this.templateSelected.emit(settings.templateName ?? template.name);
          this.pendingSave = null;
          this.savingSelection.set(false);
          this.pendingDialog.set(null);
          this.detailTemplate.set(null);
          this.view.set('gallery');
        },
        error: (error: InvitationError) => {
          this.savingSelection.set(false);
          this.pendingDialog.set(null);
          this.basicInfoServerErrors.set(
            error.reason === 'validation'
              ? error.fieldErrors
              : { templateId: ["We couldn't save your changes. Please try again."] },
          );
        },
      });
  }
}
