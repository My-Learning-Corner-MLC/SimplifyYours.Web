import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Shared `alertdialog` shell for the invitation confirm flows (`UseTemplateConfirmDialog`,
 * `ChangeTemplateConfirmDialog`).
 *
 * Deliberately stricter than the RSVP modal (`invitation-page.html`'s `role="dialog"` + a clickable
 * backdrop button): these are irreversible-ish decisions about the organiser's invitation, so the
 * scrim has no click handler at all — Cancel/Escape or the primary action are the only ways out.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog implements OnInit, OnDestroy {
  readonly heading = input.required<string>();
  readonly ariaLabel = input<string | null>(null);
  readonly primaryLabel = input.required<string>();
  readonly cancelLabel = input<string>('Cancel');
  /** Shows a small warning glyph beside the heading — used by ChangeTemplateConfirmDialog. */
  readonly warning = input<boolean>(false);
  /**
   * The primary action destroys something (e.g. "Discard") — styled outlined/coral like
   * create-event's own discard-and-leave dialog, with Cancel styled solid instead, so the visual
   * weight nudges toward the reversible choice rather than the destructive one.
   */
  readonly danger = input<boolean>(false);
  readonly primaryDisabled = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly headingEl = viewChild<ElementRef<HTMLElement>>('headingEl');
  private previouslyFocused: HTMLElement | null = null;

  ngOnInit(): void {
    // The trigger that opened this dialog gets focus back on close — captured here rather than by
    // the parent, so every dialog built on this shell gets the behaviour for free.
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    queueMicrotask(() => this.headingEl()?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus?.();
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }

  protected onConfirm(): void {
    if (!this.primaryDisabled()) {
      this.confirmed.emit();
    }
  }
}
