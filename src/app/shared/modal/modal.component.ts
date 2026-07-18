import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Output, computed, effect, input, signal } from '@angular/core';

// Matches the CSS exit-animation duration below — the component isn't torn
// down (or reused for a new open) mid-fade.
const CLOSE_ANIMATION_MS = 300;

type Phase = 'idle' | 'open' | 'closing';

/**
 * Shared modal shell — blurred plum backdrop, centered card, a fixed
 * header/footer around an independently scrolling body, and one consistent
 * open/close animation — so every modal in the app looks and behaves the
 * same. Consumers project their own header/body/footer content; only the
 * outer chrome and its close mechanics (Escape, backdrop click, exit
 * animation timing) live here.
 *
 * Two ways to drive visibility, both supported:
 * - Keep this component always mounted and bind `[open]` (e.g. a form modal
 *   that resets its fields via `ngOnChanges` while staying instantiated).
 * - Mount it with `@if` only while shown, leave `open` at its default `true`,
 *   and trigger closes via a template reference variable's `requestClose()`
 *   (e.g. `<app-modal #m (closed)="closed.emit()"><button (click)="m.requestClose()">`).
 *   The host component unmounts only after `(closed)` fires, once the exit
 *   animation has actually finished playing.
 *
 * Visibility is a 3-state machine (`idle` -> `open` -> `closing` -> `idle`)
 * rather than two independently-toggled booleans, specifically so an
 * always-mounted consumer's `[open]` binding settling to `false` *after* the
 * close animation has already completed (which happens whenever `close()` is
 * triggered from inside — Cancel/×/Escape/backdrop — and only later
 * propagates back down through the consumer's own `visible` flag) can never
 * re-open the exit transition or leave the overlay stuck rendered. A close
 * only ever starts from `open`, and only the animation's own timeout — never
 * an external `open()` re-arriving at `false` — moves `closing` back to `idle`.
 */
@Component({
  standalone: true,
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly open = input(true);
  readonly ariaLabelledby = input<string | null>(null);
  readonly maxWidth = input('30rem');
  readonly closeOnBackdrop = input(false);
  readonly closeOnEscape = input(true);
  // Suppresses every close trigger (Escape, backdrop, requestClose) — for a
  // modal mid-submit, mirroring each consumer's existing `submitting`/`saving` guard.
  readonly disableClose = input(false);

  @Output() readonly closed = new EventEmitter<void>();

  // Always starts 'idle', even when `open` defaults/binds to true — a signal
  // input's real bound value isn't reliably readable yet from a field
  // initializer (it may still see the input's declared default at that
  // point). The constructor's effect corrects this to 'open' on its first
  // run, before the initial render is read, so there's no visible flash.
  private readonly phase = signal<Phase>('idle');
  readonly shouldRender = computed(() => this.phase() !== 'idle');
  readonly closing = computed(() => this.phase() === 'closing');

  private closeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        // A fresh (re)open, from any prior phase — cancel any pending close.
        if (this.closeTimeout !== null) {
          clearTimeout(this.closeTimeout);
          this.closeTimeout = null;
        }
        this.phase.set('open');
      } else if (this.phase() === 'open') {
        // Only a transition *from fully open* is a real close to animate —
        // `open()` re-settling to false while already `closing`/`idle` is an
        // echo of a close this component itself already started, not a new one.
        this.beginClose();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.closeOnEscape()) {
      this.requestClose();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.requestClose();
    }
  }

  /** Plays the exit animation, then emits `closed` once it completes. */
  requestClose(): void {
    if (this.disableClose() || this.phase() !== 'open') {
      return;
    }
    this.beginClose();
  }

  private beginClose(): void {
    this.phase.set('closing');
    this.closeTimeout = setTimeout(() => {
      this.closeTimeout = null;
      this.phase.set('idle');
      this.closed.emit();
    }, CLOSE_ANIMATION_MS);
  }
}
