import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { GuestApiClient } from '../../../core/guests/guest-api-client';
import { InvitationSelectionService } from '../../../core/invitations/invitation-selection.service';
import { InvitationSettingsApiClient } from '../../../core/invitations/invitation-settings-api-client';
import { InvitationFieldValues } from '../../../core/invitations/invitation-settings.model';
import { InvitationError } from '../../../core/invitations/invitation.model';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { BasicInfoForm } from './basic-info-form';
import { ChangeTemplateConfirmDialog } from './change-template-confirm-dialog';
import { TemplateDetail } from './template-detail';
import { TemplateGallery } from './template-gallery';
import { UseTemplateConfirmDialog } from './use-template-confirm-dialog';

type View = 'gallery' | 'detail' | 'basic-info';
type PendingDialog = 'use' | 'change' | null;

/**
 * The Invitations tab's top-level container: owns navigation between the gallery, a template's
 * detail/preview, and the basic-info content form, and wires the confirm dialogs to the actual
 * save call.
 *
 * "≥1 guest already has an invitation link" is approximated here as "≥1 guest exists": every guest
 * gets a copyable invitation link the moment they are added (see `GuestApiClient.getInvitationLink`
 * and the Guests tab's "Copy link" button), independent of whether anything was ever sent through
 * `notification-service` — there is no separate "link issued" flag on `Guest` to check instead.
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

  protected readonly view = signal<View>('gallery');
  protected readonly detailTemplate = signal<TemplateCatalogItem | null>(null);
  protected readonly pendingDialog = signal<PendingDialog>(null);
  protected readonly savingSelection = signal(false);
  protected readonly selectionError = signal<string | null>(null);
  protected readonly basicInfoSaving = signal(false);
  protected readonly basicInfoServerErrors = signal<Readonly<Record<string, readonly string[]>>>({});

  /**
   * Best-effort guest count for the confirm-dialog decision and the basic-info form's "already
   * sent" warning. A failed fetch falls back to 0 (the more permissive "Use this template" dialog)
   * rather than blocking the flow outright — see the class remarks for why the underlying signal
   * cannot be exact anyway.
   */
  protected readonly guestCount = signal(0);

  constructor() {
    effect(() => {
      const eventId = this.eventId();
      this.selection.load(eventId);
      this.guestApi.listGuests(eventId).subscribe({
        next: (guests) => this.guestCount.set(guests.length),
        error: () => this.guestCount.set(0),
      });
    });
  }

  protected onTemplateChosen(template: TemplateCatalogItem): void {
    this.detailTemplate.set(template);
    this.view.set('detail');
  }

  protected onGalleryViewDetail(template: TemplateCatalogItem): void {
    this.detailTemplate.set(template);
    this.view.set('detail');
  }

  protected onGalleryEditBasicInfo(): void {
    this.view.set('basic-info');
  }

  protected onDetailBack(): void {
    this.detailTemplate.set(null);
    this.view.set('gallery');
  }

  protected onUseTemplate(): void {
    this.selectionError.set(null);
    this.pendingDialog.set(this.guestCount() > 0 ? 'change' : 'use');
  }

  protected onDialogCancelled(): void {
    this.pendingDialog.set(null);
  }

  protected onDialogConfirmed(): void {
    const template = this.detailTemplate();
    if (!template) {
      return;
    }

    this.savingSelection.set(true);
    this.selectionError.set(null);

    const existingValues = this.selection.settings()?.fieldValues ?? {};

    this.settingsApi.saveSettings(this.eventId(), { templateId: template.id, fieldValues: existingValues }).subscribe({
      next: (settings) => {
        this.selection.applySaved(settings);
        this.savingSelection.set(false);
        this.pendingDialog.set(null);
        this.view.set('basic-info');
      },
      error: () => {
        this.savingSelection.set(false);
        this.pendingDialog.set(null);
        this.selectionError.set("We couldn't set that template. Please try again.");
      },
    });
  }

  protected onBasicInfoSave(values: InvitationFieldValues): void {
    const templateId = this.selection.settings()?.templateId;
    if (!templateId) {
      return;
    }

    this.basicInfoSaving.set(true);
    this.basicInfoServerErrors.set({});

    this.settingsApi.saveSettings(this.eventId(), { templateId, fieldValues: values }).subscribe({
      next: (settings) => {
        this.selection.applySaved(settings);
        this.basicInfoSaving.set(false);
        this.view.set('gallery');
      },
      error: (error: InvitationError) => {
        this.basicInfoSaving.set(false);
        this.basicInfoServerErrors.set(
          error.reason === 'validation'
            ? error.fieldErrors
            : { templateId: ["We couldn't save your changes. Please try again."] },
        );
      },
    });
  }

  protected onBasicInfoDismissed(): void {
    this.view.set('gallery');
  }
}
