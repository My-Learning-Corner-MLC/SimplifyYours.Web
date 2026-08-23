import { ChangeDetectionStrategy, Component, ViewChild, effect, inject, input, output, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';

import { eventTypeLabel } from '../../../core/events/event-type-display';
import { InvitationSelectionService } from '../../../core/invitations/invitation-selection.service';
import { InvitationSettingsApiClient } from '../../../core/invitations/invitation-settings-api-client';
import { InvitationError } from '../../../core/invitations/invitation.model';
import { TemplateCatalogItem } from '../../../core/invitations/template-catalog.model';
import { BasicInfoForm, BasicInfoSaveEvent } from './basic-info-form';
import { TemplateDetail } from './template-detail';
import { TemplateGallery } from './template-gallery';
import {
  TemplateThumbnailMotif,
  templateThumbnailAccent,
  templateThumbnailBackground,
  templateThumbnailMotif,
} from './template-thumbnail-tokens';

type View = 'gallery' | 'detail';

/**
 * The Invitations tab's top-level container: owns navigation between the gallery and a template's
 * detail/preview, and wires the basic-info drawer to the actual save call. Basic info opens as a
 * right-side drawer over the detail view rather than a view of its own — the template stays
 * mounted and visible (dimmed) behind it, so switching link type or re-checking the preview never
 * requires leaving the form.
 *
 * "Use this template" (a new selection) and "Edit basic info" (an already-applied one) both open
 * the same drawer — nothing is saved yet. Save validates the form and persists the template choice
 * and field values together immediately, no confirmation step; Cancel/× discards immediately too.
 *
 * TODO(slice-3): no `SendInvitationsButton`/`SendInvitationsConfirmDialog` here on purpose.
 * `notification-service` does not exist yet, so there is nothing for a "Send invitations" action to
 * call — an organiser can copy each guest's link by hand from the Guests tab today. Wire this up
 * once that service ships rather than shipping a button that looks actionable and silently fails.
 */
@Component({
  selector: 'app-invitations-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TemplateGallery, TemplateDetail, BasicInfoForm, DrawerModule],
  templateUrl: './invitations-tab.html',
  styleUrl: './invitations-tab.scss',
})
export class InvitationsTab {
  private readonly settingsApi = inject(InvitationSettingsApiClient);
  protected readonly selection = inject(InvitationSelectionService);

  readonly eventId = input.required<string>();
  readonly eventType = input.required<string>();

  /**
   * Fires once, right after a template selection is actually saved — not on every render — so the
   * Guests tab toolbar can announce it via a single `aria-live="polite"` region instead of one that
   * re-announces on every unrelated change to shared selection state.
   */
  readonly templateSelected = output<string>();

  protected readonly view = signal<View>('gallery');
  protected readonly detailTemplate = signal<TemplateCatalogItem | null>(null);
  /** Whether the basic-info drawer is open over the current detail view. */
  protected readonly basicInfoOpen = signal(false);
  protected readonly savingSelection = signal(false);
  protected readonly selectionError = signal<string | null>(null);
  protected readonly basicInfoServerErrors = signal<Readonly<Record<string, readonly string[]>>>({});
  /**
   * Whether the template being edited was already the organiser's saved selection when the drawer
   * was opened — captured once, at open time, so a save mid-edit can't retroactively change which
   * behaviour applies. Drives where a successful save lands: a first-time "Use this template" takes
   * the organiser to the gallery to confirm the choice; "Edit basic info" on an already-selected
   * template just closes the drawer back onto the detail view they were already looking at, since
   * the gallery behind it wouldn't look any different than before.
   */
  protected readonly editingExistingSelection = signal(false);

  /**
   * Lets the drawer header's × button (in `<p-drawer>`'s own header slot, rendered unconditionally
   * — see the template's remarks) call into `BasicInfoForm`'s `onCancel()` (discards immediately).
   * A template reference variable can't do this here: PrimeNG's Drawer captures its `pTemplate`
   * content children exactly once, in `ngAfterContentInit`, so that header template must stay a
   * structurally-unconditional child of `<p-drawer>` — which puts it in a different `@if` scope
   * than `<app-basic-info-form>`, out of reach of a `#ref` declared there. `@ViewChild` isn't
   * scope-bound the same way and updates as the form mounts/unmounts.
   */
  @ViewChild(BasicInfoForm) private readonly basicInfoFormRef?: BasicInfoForm;

  protected onCloseHeader(): void {
    this.basicInfoFormRef?.onCancel();
  }

  /**
   * The drawer's header lives in `<p-drawer>`'s own header slot (see `pTemplate="header"` in the
   * template) rather than inside `BasicInfoForm`, since `<p-drawer>` only queries for that
   * template as its own direct content — a child component can't supply it. These thin wrappers
   * around the shared thumbnail-token functions exist only so the template can call them; the
   * functions themselves are shared with `TemplateGallery`/`TemplateDetail`.
   */
  protected thumbAccent(template: TemplateCatalogItem): string {
    return templateThumbnailAccent(template);
  }

  protected thumbBackground(template: TemplateCatalogItem): string {
    return templateThumbnailBackground(template);
  }

  protected thumbMotif(template: TemplateCatalogItem): TemplateThumbnailMotif {
    return templateThumbnailMotif(template);
  }

  protected typeLabel(type: string): string {
    return eventTypeLabel(type);
  }

  constructor() {
    effect(() => this.selection.load(this.eventId()));
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
    // A stale banner from a previous attempt must never carry over into a fresh open.
    this.basicInfoServerErrors.set({});
    // Matches TemplateDetail's own isSelected() check (which drives its "Edit basic info" vs "Use
    // this template" label) — not just selection.hasTemplate(), since the organiser could be
    // viewing a *different* template's detail while another one is already selected; that's still
    // a new selection, not an edit, even though something is already configured.
    this.editingExistingSelection.set(this.detailTemplate()?.id === this.selection.settings()?.templateId);
    this.basicInfoOpen.set(true);
  }

  /** Save persists immediately — no "Use this template?"/"Change template?" confirmation step. */
  protected onBasicInfoSave(event: BasicInfoSaveEvent): void {
    const template = this.detailTemplate();

    if (!template) {
      return;
    }

    this.savingSelection.set(true);
    this.selectionError.set(null);
    // This attempt passed local validation — any banner from a previous failed attempt is stale.
    this.basicInfoServerErrors.set({});

    this.settingsApi
      .saveSettings(this.eventId(), {
        templateId: template.id,
        fieldValues: event.fieldValues,
        publicLinkEnabled: event.publicLinkEnabled,
      })
      .subscribe({
        next: (settings) => {
          this.selection.applySaved(settings);
          this.templateSelected.emit(settings.templateName ?? template.name);
          this.savingSelection.set(false);
          this.basicInfoOpen.set(false);

          // A first-time selection goes to the gallery, where the new "currently selected" summary
          // confirms the choice actually took. Editing an already-selected template's info leaves
          // the gallery looking no different than before the edit, so that redirect would read as
          // nothing having happened — closing the drawer back onto the detail view they were
          // already on is the visible confirmation instead.
          if (!this.editingExistingSelection()) {
            this.detailTemplate.set(null);
            this.view.set('gallery');
          }
        },
        error: (error: InvitationError) => {
          this.savingSelection.set(false);
          this.basicInfoServerErrors.set(
            error.reason === 'validation'
              ? error.fieldErrors
              : { templateId: ["We couldn't save your changes. Please try again."] },
          );
        },
      });
  }

  /** Cancel/× — discards immediately, no confirmation asked. */
  protected onBasicInfoDismissed(): void {
    // Closes the drawer back onto the detail view they were reached from — not the gallery — so
    // the organiser lands back on the preview, not further away from it.
    this.basicInfoServerErrors.set({});
    this.basicInfoOpen.set(false);
  }
}
