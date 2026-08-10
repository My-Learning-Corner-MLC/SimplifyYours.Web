import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/** Minimum frame height before the document reports its own, so nothing flashes at zero. */
const MIN_HEIGHT_PX = 480;

/** Anything taller than this is a runaway document, not a long invitation. */
const MAX_HEIGHT_PX = 20_000;

interface BridgeMessage {
  readonly type?: unknown;
  readonly height?: unknown;
}

/**
 * Hosts the server-rendered invitation in a sandboxed iframe.
 *
 * The sandbox is `allow-scripts` and deliberately **not** `allow-same-origin`: with both, the
 * framed document can reach up and remove its own sandbox attribute, which makes the isolation
 * decorative. Without `allow-same-origin` the document cannot touch this app's DOM, cookies or
 * storage, and `postMessage` is the entire interface between them.
 *
 * Messages are treated as a signal, never as data. A `sy:rsvp` message means "the guest clicked
 * RSVP" and nothing more — everything the form needs is read from state this app already holds.
 */
@Component({
  selector: 'sy-invitation-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <iframe
      #frame
      class="invitation-frame"
      title="Invitation"
      sandbox="allow-scripts"
      referrerpolicy="no-referrer"
      [style.height.px]="height()"
      [src]="safeSrc()"
      (load)="loaded.emit()"
    ></iframe>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .invitation-frame {
        display: block;
        width: 100%;
        border: 0;
      }
    `,
  ],
})
export class InvitationFrame {
  /** The render endpoint URL. */
  readonly src = input.required<string>();

  /** Origin the framed document is expected to post from — the API origin serving it. */
  readonly expectedOrigin = input.required<string>();

  readonly rsvpRequested = output<void>();
  readonly loaded = output<void>();

  protected readonly height = signal(MIN_HEIGHT_PX);

  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    const listener = (event: MessageEvent): void => this.onMessage(event);

    window.addEventListener('message', listener);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('message', listener));
  }

  protected safeSrc(): SafeResourceUrl {
    // The URL is built by this app from a configured origin, never from page content.
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.src());
  }

  private onMessage(event: MessageEvent): void {
    // Both checks matter. Origin alone would accept a message from any other frame served by the
    // same API origin; source alone would accept one from an unrelated origin in our own frame.
    if (event.origin !== this.expectedOrigin()) {
      return;
    }

    if (event.source !== this.frame().nativeElement.contentWindow) {
      return;
    }

    const message = event.data as BridgeMessage | null;

    if (!message || typeof message.type !== 'string') {
      return;
    }

    if (message.type === 'sy:rsvp') {
      this.rsvpRequested.emit();
      return;
    }

    if (message.type === 'sy:height' && typeof message.height === 'number') {
      this.applyHeight(message.height);
    }
  }

  private applyHeight(height: number): void {
    if (!Number.isFinite(height)) {
      return;
    }

    this.height.set(Math.min(Math.max(Math.ceil(height), MIN_HEIGHT_PX), MAX_HEIGHT_PX));
  }
}
