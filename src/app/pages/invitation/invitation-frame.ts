import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

/** What a sandboxed document without allow-same-origin reports as its origin. */
const OPAQUE_ORIGIN = 'null';

interface BridgeMessage {
  readonly type?: unknown;
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
  selector: 'app-invitation-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <iframe
      #frame
      class="invitation-frame"
      [class.invitation-frame--embedded]="!fill()"
      title="Invitation"
      sandbox="allow-scripts"
      referrerpolicy="no-referrer"
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
        /* Fills the viewport and scrolls its own content. dvh first so mobile browser chrome
           appearing does not clip the invitation; vh is the fallback for older engines. */
        height: 100vh;
        height: 100dvh;
        border: 0;
      }

      /* Used when this frame sits inside a bounded panel (e.g. the template detail's live
         preview) rather than owning the whole page — a fixed height instead of the viewport.
         Tall enough to fit a real rendered invitation without clipping it — see
         template-preview-frame.scss's .preview-frame__body, which this height matches. */
      .invitation-frame--embedded {
        height: 50rem;
      }
    `,
  ],
})
export class InvitationFrame {
  /** The render endpoint URL. */
  readonly src = input.required<string>();

  /** Origin the framed document is expected to post from — the API origin serving it. */
  readonly expectedOrigin = input.required<string>();

  /** False when embedded in a bounded panel instead of owning the full page. Defaults to true. */
  readonly fill = input<boolean>(true);

  readonly rsvpRequested = output<void>();
  readonly loaded = output<void>();

  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  constructor() {
    const listener = (event: MessageEvent): void => this.onMessage(event);

    window.addEventListener('message', listener);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('message', listener));
  }

  /**
   * Applies the URL to the element directly rather than through a `[src]` binding.
   *
   * Assigning an iframe's `src` reloads its document even when the value is unchanged, so any
   * re-application of the binding — for any reason — restarts the load. Paired with the height
   * bridge that becomes a loop: load → report height → change detection → re-apply → reload, which
   * re-requests the render endpoint until rate limiting rejects it.
   *
   * Guarding on the element's own resolved `src` makes the assignment idempotent, so the document
   * loads exactly once per URL no matter how often change detection runs.
   *
   * The URL is built by this app from a configured origin, never from page content.
   */
  private readonly applySrc = effect(() => {
    // Undefined until the view is created; as a signal, this re-runs once the query resolves.
    // Defensive rather than a fix for anything observed — the blank frame was a CSP
    // frame-ancestors mismatch, not a timing problem.
    const element = this.frame()?.nativeElement;
    const url = this.src();

    if (!element || !url) {
      return;
    }

    // `element.src` reports the resolved absolute URL, which is what we must compare against.
    const resolved = new URL(url, document.baseURI).href;

    if (element.src !== resolved) {
      element.src = resolved;
    }
  });

  private onMessage(event: MessageEvent): void {
    // The frame is sandboxed WITHOUT allow-same-origin, so its documents run in an opaque origin
    // and every message it sends reports event.origin as the literal string "null" — never the API
    // origin that served it. Comparing against the API origin rejected every message, which is why
    // the RSVP button did nothing.
    //
    // The authoritative check is the source: it pins the message to this component's own frame,
    // which no other document can impersonate. Origin is kept as a secondary guard so a future
    // change that drops the sandbox does not silently start accepting cross-origin senders.
    const fromOurFrame = event.source === this.frame()?.nativeElement.contentWindow;
    const originAllowed = event.origin === OPAQUE_ORIGIN || event.origin === this.expectedOrigin();

    if (!fromOurFrame || !originAllowed) {
      return;
    }

    const message = event.data as BridgeMessage | null;

    if (!message || typeof message.type !== 'string') {
      return;
    }

    if (message.type === 'sy:rsvp') {
      this.rsvpRequested.emit();
    }
  }

}
