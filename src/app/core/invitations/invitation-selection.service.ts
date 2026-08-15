import { Injectable, computed, inject, signal } from '@angular/core';

import { InvitationSettingsApiClient } from './invitation-settings-api-client';
import { InvitationSettings } from './invitation-settings.model';

export type InvitationSelectionState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The single source of truth for "has this event got an invitation template chosen".
 *
 * Both the Guests tab toolbar (compact note + CTA) and the Invitations tab (gallery "currently
 * selected" summary bar) read from this service rather than fetching independently, so the two
 * surfaces can never disagree about the current selection after one of them changes it.
 *
 * `providedIn: 'root'`, but state is keyed to whichever event was last loaded — `EventDetailPage`
 * calls {@link load} once per event id, mirroring how it resets `guestsState` on navigation between
 * events.
 */
@Injectable({ providedIn: 'root' })
export class InvitationSelectionService {
  private readonly api = inject(InvitationSettingsApiClient);

  private readonly _state = signal<InvitationSelectionState>('idle');
  private readonly _settings = signal<InvitationSettings | null>(null);
  private eventId: string | null = null;

  readonly state = this._state.asReadonly();
  readonly settings = this._settings.asReadonly();

  /** True once a template has been chosen and the invitation actually saved (not a draft default). */
  readonly hasTemplate = computed(() => {
    const settings = this._settings();
    return !!settings?.templateId && settings.isConfigured;
  });

  load(eventId: string): void {
    if (this.eventId === eventId && this._state() !== 'idle' && this._state() !== 'error') {
      return;
    }

    this.eventId = eventId;
    this._state.set('loading');

    this.api.getSettings(eventId).subscribe({
      next: (settings) => {
        this._settings.set(settings);
        this._state.set('ready');
      },
      error: () => this._state.set('error'),
    });
  }

  /** Re-fetches regardless of whether the event id changed — used after a save. */
  refresh(): void {
    if (!this.eventId) {
      return;
    }
    const eventId = this.eventId;
    this.eventId = null;
    this.load(eventId);
  }

  /** Applies a settings response the caller already has (e.g. straight from a successful save). */
  applySaved(settings: InvitationSettings): void {
    this.eventId = settings.eventId;
    this._settings.set(settings);
    this._state.set('ready');
  }

  /** Clears state — call when navigating away from the event entirely. */
  reset(): void {
    this.eventId = null;
    this._settings.set(null);
    this._state.set('idle');
  }
}
