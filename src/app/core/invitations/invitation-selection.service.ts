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
  /**
   * The chosen template's display name. `InvitationSettingsResponse` carries only `templateId` (a
   * GUID) — the name lives in `template-management-service`'s catalog, which nothing here fetches
   * on its own. Populated opportunistically by whichever surface resolves it first: `TemplateGallery`
   * once its catalog fetch matches the id, or `InvitationsTab` directly off the template the
   * organiser just chose. `null` until then is a real, honest state — the Guests tab toolbar falls
   * back to an un-named note rather than guessing.
   */
  private readonly _templateName = signal<string | null>(null);
  private eventId: string | null = null;

  readonly state = this._state.asReadonly();
  readonly settings = this._settings.asReadonly();
  readonly templateName = this._templateName.asReadonly();

  /** True once a template has been chosen and the invitation actually saved (not a draft default). */
  readonly hasTemplate = computed(() => {
    const settings = this._settings();
    return !!settings?.templateId && settings.isConfigured;
  });

  /**
   * Whether the event's public invitation link is enabled. `GET`/`PUT .../settings/events/{id}`
   * both return this directly now, so it is derived straight from the last-loaded settings rather
   * than tracked separately — no session-only guessing, and a page that opens directly on the
   * template detail view sees the real current state, not an assumed-off default.
   */
  readonly publicLinkEnabled = computed(() => this._settings()?.publicLinkEnabled ?? false);

  /** Null unless {@link publicLinkEnabled} is true. */
  readonly publicEventToken = computed(() => this._settings()?.publicEventToken ?? null);

  load(eventId: string): void {
    if (this.eventId === eventId && this._state() !== 'idle' && this._state() !== 'error') {
      return;
    }

    this.eventId = eventId;
    this._state.set('loading');
    this._templateName.set(null);

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

  /** Records the chosen template's display name once some surface has resolved it. */
  setTemplateName(name: string): void {
    this._templateName.set(name);
  }

  /** Clears state — call when navigating away from the event entirely. */
  reset(): void {
    this.eventId = null;
    this._settings.set(null);
    this._state.set('idle');
    this._templateName.set(null);
  }
}
