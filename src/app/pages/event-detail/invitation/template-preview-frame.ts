import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { InvitationFrame } from '../../invitation/invitation-frame';

export type PreviewLinkType = 'private' | 'public';

/**
 * Hosts the organiser's live template preview, on top of the same sandboxed iframe pattern the
 * guest-facing invitation page uses ({@link InvitationFrame}) — `sandbox="allow-scripts"` without
 * `allow-same-origin`, so the framed document can never reach up into this app.
 *
 * `src` stays `null` until the caller has a preview token in hand: the render endpoint's
 * `?mode=preview&type=...` combination requires a resolvable token, and setting a src before one
 * exists would just render a 404 inside the frame.
 */
@Component({
  selector: 'app-template-preview-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InvitationFrame],
  template: `
    <div class="preview-frame">
      <div class="preview-frame__header">
        <span class="preview-frame__label">
          LIVE PREVIEW · {{ linkType() === 'public' ? 'PUBLIC' : 'GUEST LINK' }} · SAMPLE DATA
        </span>
        <span class="preview-frame__badge">
          <span class="preview-frame__dot" aria-hidden="true"></span>
          SANDBOXED
        </span>
      </div>

      <div class="preview-frame__body">
        @if (!src()) {
          <div class="preview-frame__status" role="status" aria-live="polite">
            <span class="preview-frame__spinner" aria-hidden="true"></span>
            <p>Preparing preview…</p>
          </div>
        } @else {
          <app-invitation-frame
            [src]="src()!"
            [expectedOrigin]="apiOrigin()"
            [fill]="false"
            (loaded)="loaded.emit()"
          />
        }
      </div>
    </div>
  `,
  styleUrl: './template-preview-frame.scss',
})
export class TemplatePreviewFrame {
  /** `null` until a preview token has been issued. */
  readonly src = input<string | null>(null);
  readonly apiOrigin = input.required<string>();
  readonly linkType = input<PreviewLinkType>('private');

  readonly loaded = output<void>();
}
