import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { InvitationSelectionService } from './invitation-selection.service';
import { InvitationSettingsApiClient } from './invitation-settings-api-client';
import { InvitationSettings } from './invitation-settings.model';

const SETTINGS: InvitationSettings = {
  eventId: 'event-1',
  eventType: 'wedding',
  templateId: 'template-1',
  fieldValues: { brideName: 'Amara' },
  isConfigured: true,
  requiredFields: ['brideName'],
  publicLinkEnabled: false,
  publicEventToken: null,
};

describe('InvitationSelectionService', () => {
  let apiClient: { getSettings: ReturnType<typeof vi.fn> };
  let service: InvitationSelectionService;

  beforeEach(() => {
    apiClient = { getSettings: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: InvitationSettingsApiClient, useValue: apiClient }],
    });

    service = TestBed.inject(InvitationSelectionService);
  });

  it('starts idle with no template', () => {
    expect(service.state()).toBe('idle');
    expect(service.hasTemplate()).toBe(false);
  });

  it('loads settings and reports hasTemplate once configured', () => {
    apiClient.getSettings.mockReturnValue(of(SETTINGS));

    service.load('event-1');

    expect(service.state()).toBe('ready');
    expect(service.hasTemplate()).toBe(true);
    expect(service.settings()).toEqual(SETTINGS);
  });

  it('reports no template when nothing has been configured yet', () => {
    apiClient.getSettings.mockReturnValue(of({ ...SETTINGS, templateId: null, isConfigured: false }));

    service.load('event-1');

    expect(service.hasTemplate()).toBe(false);
  });

  it('does not re-fetch for the same event id once ready', () => {
    apiClient.getSettings.mockReturnValue(of(SETTINGS));

    service.load('event-1');
    service.load('event-1');

    expect(apiClient.getSettings).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when the event id changes', () => {
    apiClient.getSettings.mockReturnValue(of(SETTINGS));

    service.load('event-1');
    service.load('event-2');

    expect(apiClient.getSettings).toHaveBeenCalledTimes(2);
  });

  it('sets an error state on failure', () => {
    apiClient.getSettings.mockReturnValue(throwError(() => ({ reason: 'network' })));

    service.load('event-1');

    expect(service.state()).toBe('error');
  });

  it('applySaved updates settings immediately without a fetch', () => {
    service.applySaved(SETTINGS);

    expect(service.state()).toBe('ready');
    expect(service.hasTemplate()).toBe(true);
    expect(apiClient.getSettings).not.toHaveBeenCalled();
  });

  it('refresh re-fetches for the current event', () => {
    apiClient.getSettings.mockReturnValue(of(SETTINGS));
    service.load('event-1');

    service.refresh();

    expect(apiClient.getSettings).toHaveBeenCalledTimes(2);
  });

  it('reset clears state back to idle', () => {
    service.applySaved(SETTINGS);
    service.reset();

    expect(service.state()).toBe('idle');
    expect(service.settings()).toBeNull();
    expect(service.hasTemplate()).toBe(false);
  });

  it('defaults publicLinkEnabled to false before anything has loaded', () => {
    expect(service.publicLinkEnabled()).toBe(false);
    expect(service.publicEventToken()).toBeNull();
  });

  it('derives publicLinkEnabled and publicEventToken from the loaded settings, not session state', () => {
    apiClient.getSettings.mockReturnValue(
      of({ ...SETTINGS, publicLinkEnabled: true, publicEventToken: 'pub-token' }),
    );

    service.load('event-1');

    expect(service.publicLinkEnabled()).toBe(true);
    expect(service.publicEventToken()).toBe('pub-token');
  });

  it('reflects a disabled link with a null token from applySaved', () => {
    service.applySaved({ ...SETTINGS, publicLinkEnabled: false, publicEventToken: null });

    expect(service.publicLinkEnabled()).toBe(false);
    expect(service.publicEventToken()).toBeNull();
  });

  it('resets publicLinkEnabled and publicEventToken on reset', () => {
    service.applySaved({ ...SETTINGS, publicLinkEnabled: true, publicEventToken: 'pub-token' });

    service.reset();

    expect(service.publicLinkEnabled()).toBe(false);
    expect(service.publicEventToken()).toBeNull();
  });

  it('defaults templateName to null and lets a surface resolve it later', () => {
    expect(service.templateName()).toBeNull();

    service.setTemplateName('Verona');

    expect(service.templateName()).toBe('Verona');
  });

  it('resets templateName on a fresh load for a new event', () => {
    apiClient.getSettings.mockReturnValue(of(SETTINGS));
    service.setTemplateName('Verona');

    service.load('event-2');

    expect(service.templateName()).toBeNull();
  });

  it('resets templateName on reset', () => {
    service.setTemplateName('Verona');

    service.reset();

    expect(service.templateName()).toBeNull();
  });
});
