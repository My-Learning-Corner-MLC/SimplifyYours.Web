import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { environment } from '../../../environments/environment';
import { InvitationApiClient } from '../../core/invitations/invitation-api-client';
import { Invitation, InvitationError } from '../../core/invitations/invitation.model';
import { InvitationFrame } from './invitation-frame';

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
  imports: [InvitationFrame],
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
    // T11 opens the RSVP modal here. The bridge message has already been origin-checked by
    // InvitationFrame, and carries no data of its own.
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
