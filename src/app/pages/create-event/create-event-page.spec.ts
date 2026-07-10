import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { CreateEventResponse } from '../../core/events/create-event-response.model';
import { CreateEventPage } from './create-event-page';

describe('CreateEventPage', () => {
  let fixture: ComponentFixture<CreateEventPage>;
  let component: CreateEventPage;
  let httpMock: HttpTestingController;
  let messageAdd: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  const url = `${environment.eventBaseUrl}/events`;

  const futureDate = (): string => {
    const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  };

  const createdResponse = (): CreateEventResponse => ({
    id: 'e1',
    eventName: 'Mateo turns five',
    eventDate: '2026-08-17',
    eventType: 'birthday',
    eventDescription: null,
    eventStartTime: null,
    eventEndTime: null,
    createdAt: '2026-07-06T10:00:00+00:00',
    updatedAt: '2026-07-06T10:00:00+00:00',
    concurrencyToken: 'token',
    location: null,
    timeZoneId: null,
  });

  const fillStepOne = (): void => {
    component.form.get('eventName')?.setValue('Mateo turns five');
    component.form.get('eventType')?.setValue('birthday');
    component.form.get('eventDate')?.setValue(futureDate());
  };

  beforeEach(async () => {
    messageAdd = vi.fn();
    await TestBed.configureTestingModule({
      imports: [CreateEventPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MessageService, useValue: { add: messageAdd } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEventPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  describe('step 1 — basics', () => {
    it('renders the basics surface with name, type chips, date, and description', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('#ce-event-name')).not.toBeNull();
      expect(el.querySelectorAll('.ce-chip').length).toBe(6);
      expect(el.querySelector('#ce-event-date')).not.toBeNull();
      expect(el.querySelector('#ce-description')).not.toBeNull();
      expect(el.querySelector('.ce-rail')).not.toBeNull();
      expect(el.textContent).not.toContain('Venue name');
    });

    it('disables Back on step 1', () => {
      const back = fixture.nativeElement.querySelector('.ce-btn-ghost') as HTMLButtonElement;
      expect(back.disabled).toBe(true);
    });

    it('blocks Next while step 1 is invalid', () => {
      component.nextStep();
      fixture.detectChanges();
      expect(component.step()).toBe(1);
      expect(fixture.nativeElement.textContent).toContain('at least 3 characters');
    });

    it('blocks Next when the event date is in the past', () => {
      fillStepOne();
      component.form.get('eventDate')?.setValue('2020-01-01');
      component.nextStep();
      expect(component.step()).toBe(1);
    });

    it('blocks Next and shows a required error when the date is left blank', () => {
      component.form.get('eventName')?.setValue('Mateo turns five');
      component.form.get('eventType')?.setValue('birthday');
      component.nextStep();
      fixture.detectChanges();
      expect(component.step()).toBe(1);
      expect(fixture.nativeElement.textContent).toContain('Pick a date for your occasion.');
    });

    it('advances to step 2 when step 1 is valid', () => {
      fillStepOne();
      component.nextStep();
      fixture.detectChanges();
      expect(component.step()).toBe(2);
      expect(fixture.nativeElement.querySelector('#ce-venue-name')).not.toBeNull();
    });
  });

  describe('step 2 — where & when', () => {
    beforeEach(() => {
      fillStepOne();
      component.nextStep();
      fixture.detectChanges();
    });

    it('renders venue, address, notes, and timezone with no online link or mode selector', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('#ce-venue-name')).not.toBeNull();
      expect(el.querySelector('#ce-address')).not.toBeNull();
      expect(el.querySelector('#ce-location-notes')).not.toBeNull();
      expect(el.querySelector('#ce-time-zone')).not.toBeNull();
      expect(el.querySelector('#ce-online-url')).toBeNull();
      expect(el.textContent).not.toMatch(/online link|in-person|hybrid/i);
    });

    it('blocks submit when location fields exceed their caps', () => {
      component.form.get('location.venueName')?.setValue('v'.repeat(201));
      component.onSubmit();
      httpMock.expectNone(url);

      component.form.get('location.venueName')?.setValue('The Backyard');
      component.form.get('location.notes')?.setValue('n'.repeat(2001));
      component.onSubmit();
      httpMock.expectNone(url);
    });

    it('stays submittable when step 2 is left empty', () => {
      const eventDate = component.form.get('eventDate')?.value;
      component.onSubmit();
      const req = httpMock.expectOne(url);
      expect(req.request.body).toEqual({
        eventName: 'Mateo turns five',
        eventType: 'birthday',
        eventDate,
      });
      req.flush(createdResponse(), { status: 201, statusText: 'Created' });
      expect(component.successEvent()).not.toBeNull();
    });
  });

  describe('submit', () => {
    beforeEach(() => {
      fillStepOne();
      component.nextStep();
      fixture.detectChanges();
    });

    it('sends the assembled payload and shows the success dialog on 201', () => {
      const date = futureDate();
      component.form.get('eventDate')?.setValue(date);
      component.form.get('startTime')?.setValue('14:00');
      component.form.get('endTime')?.setValue('18:00');
      component.form.get('eventDescription')?.setValue('Backyard party');
      component.form.get('timeZoneId')?.setValue('America/Los_Angeles');
      component.form.get('location.venueName')?.setValue('The Backyard');
      component.form.get('location.notes')?.setValue('Side gate unlocked.');

      component.onSubmit();

      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.eventName).toBe('Mateo turns five');
      expect(req.request.body.eventType).toBe('birthday');
      expect(req.request.body.eventDate).toBe(date);
      expect(req.request.body.eventStartTime).toBe('14:00');
      expect(req.request.body.eventEndTime).toBe('18:00');
      expect(req.request.body.eventDescription).toBe('Backyard party');
      expect(req.request.body.timeZoneId).toBe('America/Los_Angeles');
      expect(req.request.body.location).toEqual({
        venueName: 'The Backyard',
        address: null,
        notes: 'Side gate unlocked.',
      });
      req.flush(createdResponse(), { status: 201, statusText: 'Created' });
      fixture.detectChanges();

      expect(component.successEvent()).toEqual(createdResponse());
      const recap = component.successRecap();
      expect(recap?.name).toBe('Mateo turns five');
      expect(recap?.typeLabel).toBe('Birthday');
    });

    it('shows the success dialog for finish later, without a toast or navigation', () => {
      component.onSubmit(true);

      httpMock.expectOne(url).flush(createdResponse(), { status: 201, statusText: 'Created' });

      expect(component.successEvent()).toEqual(createdResponse());
      expect(messageAdd).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      expect(navigateSpy).not.toHaveBeenCalledWith(['/dashboard']);
    });

    it('maps server field errors onto the matching controls', () => {
      component.onSubmit();

      httpMock.expectOne(url).flush(
        {
          errors: {
            EventName: ['Event name must contain at least 3 characters.'],
            'Location.VenueName': ['Venue name must not exceed 200 characters.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(component.backendErrors()).toEqual({
        eventName: ['Event name must contain at least 3 characters.'],
        'location.venueName': ['Venue name must not exceed 200 characters.'],
      });
      expect(component.step()).toBe(1);
      expect(fixture.nativeElement.textContent).toContain(
        'Event name must contain at least 3 characters.',
      );
    });

    it('shows a generic non-field error on a 500', () => {
      component.onSubmit();

      httpMock
        .expectOne(url)
        .flush({ title: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(component.pageError()).toMatch(/something went wrong/i);
      expect(messageAdd).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });

  describe('leave confirmation', () => {
    it('allows leaving when the form is pristine', () => {
      expect(component.confirmLeave()).toBe(true);
    });

    it('asks before leaving a dirty, unsubmitted form and honors the choice', async () => {
      component.form.get('eventName')?.setValue('Mateo turns five');
      component.form.get('eventName')?.markAsDirty();

      const decision = component.confirmLeave();
      expect(component.leaveDialogVisible()).toBe(true);
      component.onLeaveChoice(true);
      await expect(decision).resolves.toBe(true);
    });

    it('allows leaving after a successful create without asking', () => {
      fillStepOne();
      component.form.markAsDirty();
      component.onSubmit();
      httpMock.expectOne(url).flush(createdResponse(), { status: 201, statusText: 'Created' });

      expect(component.confirmLeave()).toBe(true);
    });
  });

  describe('create another', () => {
    it('resets the wizard back to a blank step 1', () => {
      fillStepOne();
      component.onSubmit();
      httpMock.expectOne(url).flush(createdResponse(), { status: 201, statusText: 'Created' });
      expect(component.successEvent()).not.toBeNull();

      component.createAnother();

      expect(component.successEvent()).toBeNull();
      expect(component.step()).toBe(1);
      expect(component.form.get('eventName')?.value).toBe('');
    });
  });
});
