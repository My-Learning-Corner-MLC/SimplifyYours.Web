import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvitationFrame } from './invitation-frame';

const API_ORIGIN = 'http://api.example.test';

describe('InvitationFrame', () => {
  let fixture: ComponentFixture<InvitationFrame>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InvitationFrame] }).compileComponents();

    fixture = TestBed.createComponent(InvitationFrame);
    // The app is zoneless, so inputs must be set through componentRef to trigger change detection.
    fixture.componentRef.setInput('src', `${API_ORIGIN}/api/v1/guests/invitations/tok-abc/render`);
    fixture.componentRef.setInput('expectedOrigin', API_ORIGIN);
    fixture.detectChanges();
  });

  function iframe(): HTMLIFrameElement {
    return fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
  }

  function post(data: unknown, origin = API_ORIGIN, source: unknown = undefined): void {
    window.dispatchEvent(
      new MessageEvent('message', {
        data,
        origin,
        source: (source ?? iframe().contentWindow) as MessageEventSource | null,
      }),
    );
  }

  it('sandboxes the frame with allow-scripts and without allow-same-origin', () => {
    // Both together let the framed document remove its own sandbox attribute, which would make
    // the isolation decorative. This assertion is the guard against someone "fixing" a same-origin
    // convenience later.
    const sandbox = iframe().getAttribute('sandbox');

    expect(sandbox).toBe('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });

  it('emits when the framed document reports an RSVP click', () => {
    const emitted = vi.fn();
    fixture.componentInstance.rsvpRequested.subscribe(emitted);

    post({ type: 'sy:rsvp' });

    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('ignores a message from a foreign origin', () => {
    const emitted = vi.fn();
    fixture.componentInstance.rsvpRequested.subscribe(emitted);

    post({ type: 'sy:rsvp' }, 'https://evil.example');

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores a message that did not come from this frame', () => {
    // Origin alone is not enough: another document from the same API origin must not be able to
    // drive this page's RSVP dialog.
    const emitted = vi.fn();
    fixture.componentInstance.rsvpRequested.subscribe(emitted);

    post({ type: 'sy:rsvp' }, API_ORIGIN, window);

    expect(emitted).not.toHaveBeenCalled();
  });

  it('ignores messages that are not the expected shape', () => {
    const emitted = vi.fn();
    fixture.componentInstance.rsvpRequested.subscribe(emitted);

    post(null);
    post('sy:rsvp');
    post({ type: 42 });
    post({ type: 'sy:something-else' });

    expect(emitted).not.toHaveBeenCalled();
  });

  it('resizes the frame from a reported height', () => {
    post({ type: 'sy:height', height: 1234 });
    fixture.detectChanges();

    expect(iframe().style.height).toBe('1234px');
  });

  it('never shrinks below a minimum or grows past a sane ceiling', () => {
    // A zero-height frame reads as a broken page; a runaway one can lock up the browser.
    post({ type: 'sy:height', height: 0 });
    fixture.detectChanges();
    expect(iframe().style.height).toBe('480px');

    post({ type: 'sy:height', height: 10_000_000 });
    fixture.detectChanges();
    expect(iframe().style.height).toBe('20000px');
  });

  it('ignores a non-numeric or non-finite height', () => {
    post({ type: 'sy:height', height: 900 });
    fixture.detectChanges();

    post({ type: 'sy:height', height: 'tall' });
    post({ type: 'sy:height', height: Number.POSITIVE_INFINITY });
    fixture.detectChanges();

    expect(iframe().style.height).toBe('900px');
  });

  it('hands Angular the same SafeResourceUrl object every time', () => {
    // The regression that caused 429s in local dev. bypassSecurityTrustResourceUrl returns a NEW
    // object per call, and Angular's property binding compares by reference — so a fresh object
    // each cycle re-sets src and reloads the framed document. With the height bridge that closes a
    // loop: load → report height → change detection → reload → report height → …
    //
    // Asserted on object identity rather than iframe.src: re-assigning the same URL string leaves
    // .src unchanged, so reading it cannot detect the reload.
    const read = () => (fixture.componentInstance as unknown as { safeSrc: () => unknown }).safeSrc();

    const first = read();

    post({ type: 'sy:height', height: 900 });
    fixture.detectChanges();

    expect(read()).toBe(first);
  });

  it('does not react to height reports that would not move the frame', () => {
    post({ type: 'sy:height', height: 900 });
    fixture.detectChanges();
    expect(iframe().style.height).toBe('900px');

    // Sub-pixel jitter must not keep waking change detection.
    post({ type: 'sy:height', height: 901 });
    fixture.detectChanges();

    expect(iframe().style.height).toBe('900px');
  });
});