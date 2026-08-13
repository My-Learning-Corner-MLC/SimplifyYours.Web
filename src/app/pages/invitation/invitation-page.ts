import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { environment } from '../../../environments/environment';
import { InvitationApiClient } from '../../core/invitations/invitation-api-client';
import { Invitation, InvitationError, SubmitRsvpRequest } from '../../core/invitations/invitation.model';
import { InvitationFrame } from './invitation-frame';
import { RsvpForm } from './rsvp-form';

type PageState = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * The guest-facing invitation page. Public — no account, no session.
 *
 * Loads JSON first and only then points the frame at the render endpoint. Setting `src` up front
 * would render a 404 document inside the frame, which reads to a guest as a broken invitation
 * rather than a missing one.
 */
@Component({
  selector: 'app-invitation-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InvitationFrame, RsvpForm],
  templateUrl: './invitation-page.html',
  styleUrl: './invitation-page.scss',
})
export class InvitationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(InvitationApiClient);

  protected readonly state = signal<PageState>('loading');
  protected readonly invitation = signal<Invitation | null>(null);

  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  /** Only set once the token has been shown to resolve. */
  protected readonly renderUrl = computed(() =>
    this.state() === 'ready' ? this.api.renderUrl(this.token) : null,
  );

  /** The origin the framed document posts from — the API, not this app. */
  protected readonly apiOrigin = originOf(environment.apiBaseUrl);

  protected readonly frameLoaded = signal(false);

  protected readonly rsvpOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly submitFailed = signal(false);
  protected readonly rsvpFieldErrors = signal<Readonly<Record<string, readonly string[]>>>({});

  constructor() {
    this.load();
  }

  protected load(): void {
    this.state.set('loading');
    this.frameLoaded.set(false);

    if (!this.token) {
      this.state.set('not-found');
      return;
    }

    this.api.getInvitation(this.token).subscribe({
      next: (invitation) => {
        this.invitation.set(invitation);
        this.state.set('ready');
      },
      error: (error: InvitationError) => {
        // A missing invitation and a broken connection need different words: one is permanent and
        // one is worth retrying.
        this.state.set(error.reason === 'not-found' ? 'not-found' : 'error');
      },
    });
  }

  protected onFrameLoaded(): void {
    this.frameLoaded.set(true);
  }

  protected onRsvpRequested(): void {
    // The bridge message has already been checked against this page's own frame by InvitationFrame
    // and carries no data — it means "the guest pressed RSVP" and nothing else.
    this.submitted.set(false);
    this.submitFailed.set(false);
    this.rsvpFieldErrors.set({});
    this.rsvpOpen.set(true);
  }

  protected onRsvpClosed(): void {
    this.rsvpOpen.set(false);
  }

  protected onRsvpSubmit(request: SubmitRsvpRequest): void {
    this.submitting.set(true);
    this.submitFailed.set(false);
    this.rsvpFieldErrors.set({});

    this.api.submitRsvp(this.token, request).subscribe({
      next: (invitation) => {
        // The response carries the recorded answer, so the success panel and any later re-open
        // both show what the server actually stored rather than what was typed.
        this.invitation.set(invitation);
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: (error: InvitationError) => {
        this.submitting.set(false);

        if (error.reason === 'validation') {
          this.rsvpFieldErrors.set(error.fieldErrors);
          return;
        }

        if (error.reason === 'closed') {
          // The deadline passed while the form was open. Re-reading shows the closed state with
          // the recorded answer instead of leaving a form that can no longer be submitted.
          this.load();
          this.rsvpOpen.set(false);
          return;
        }

        this.submitFailed.set(true);
      },
    });
  }
}

function originOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    // A relative apiBaseUrl means same-origin, which is what window.origin already is.
    return window.location.origin;
  }
}
