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

  // A sandboxed frame without allow-same-origin reports "null" as its origin — this is what the
  // browser really sends, and comparing against the API origin is what broke the RSVP button.
  function post(data: unknown, origin = 'null', source: unknown = undefined): void {
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

  it('accepts the opaque origin a sandboxed frame actually sends', () => {
    const emitted = vi.fn();
    fixture.componentInstance.rsvpRequested.subscribe(emitted);

    post({ type: 'sy:rsvp' }, 'null');

    expect(emitted).toHaveBeenCalledTimes(1);
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




  it('actually loads the document', async () => {
    // The counterpart to the no-reload test below, and the gap that let a blank frame ship: a test
    // that only counts *extra* assignments also passes when src is never assigned at all.
    await fixture.whenStable();

    expect(iframe().src).toContain('/api/v1/guests/invitations/tok-abc/render');
  });

  it('assigns the iframe src exactly once, however often change detection runs', async () => {
    // The regression behind the 429s. Assigning an iframe's src reloads its document even when the
    // value is unchanged, so a re-applied binding restarts the load. Paired with the height bridge
    // that becomes a loop: load → report height → change detection → re-apply → reload.
    await fixture.whenStable();

    const element = iframe();
    let assignments = 0;
    const actual = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src')!;

    Object.defineProperty(element, 'src', {
      configurable: true,
      get: () => actual.get!.call(element),
      set: (value: string) => {
        assignments += 1;
        actual.set!.call(element, value);
      },
    });

    post({ type: 'sy:unknown' });
    fixture.detectChanges();
    post({ type: 'sy:unknown' });
    fixture.detectChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(assignments).toBe(0);
  });

  it('keeps the same document URL across change detection', () => {
    // The regression that caused 429s in local dev. bypassSecurityTrustResourceUrl returns a NEW
    // object per call, and Angular's property binding compares by reference — so a fresh object
    // each cycle re-sets src and reloads the framed document. With the height bridge that closes a
    // loop: load → report height → change detection → reload → report height → …
    //
    // Asserted on object identity rather than iframe.src: re-assigning the same URL string leaves
    // .src unchanged, so reading it cannot detect the reload.
    const before = iframe().src;

    post({ type: 'sy:unknown' });
    fixture.detectChanges();

    expect(iframe().src).toBe(before);
  });


  it('fills the viewport and lets its own content scroll', () => {
    // A long invitation scrolls inside the frame rather than growing the host page, so the frame
    // never needs to measure or chase its content — which is what previously fed the reload loop.
    const styles = getComputedStyle(iframe());

    expect(styles.height).not.toBe('0px');
    expect(iframe().getAttribute('style') ?? '').not.toContain('height');
  });
});