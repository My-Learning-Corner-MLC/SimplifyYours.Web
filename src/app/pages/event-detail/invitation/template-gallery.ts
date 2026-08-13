import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { InvitationTemplate, templatesFor } from '../../../core/invitations/invitation-template.model';

/**
 * Lets the organiser pick the invitation's look.
 *
 * Choosing does not save on its own — it opens the basic-info form, and the template is only
 * committed alongside the content that fills it. A template with no content would render an
 * invitation full of gaps, so the two are one decision.
 */
@Component({
  selector: 'app-template-gallery',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './template-gallery.html',
  styleUrl: './template-gallery.scss',
})
export class TemplateGallery {
  readonly eventType = input.required<string>();
  /** The template already saved for this event, if any. */
  readonly selectedTemplateId = input<string | null>(null);

  /** Emitted when the organiser confirms a choice — the host opens the basic-info form. */
  readonly templateChosen = output<InvitationTemplate>();

  protected readonly templates = computed(() => templatesFor(this.eventType()));

  /** Highlighted card. Starts on whatever is saved so the current choice is obvious. */
  protected readonly focused = signal<string | null>(null);

  protected activeId(): string | null {
    return this.focused() ?? this.selectedTemplateId();
  }

  protected onFocus(template: InvitationTemplate): void {
    this.focused.set(template.id);
  }

  protected onChoose(template: InvitationTemplate): void {
    this.focused.set(template.id);
    this.templateChosen.emit(template);
  }

  protected isChosen(template: InvitationTemplate): boolean {
    return this.selectedTemplateId() === template.id;
  }
}
