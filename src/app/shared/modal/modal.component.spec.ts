import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalComponent } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [closeOnBackdrop]="closeOnBackdrop()"
      [closeOnEscape]="closeOnEscape()"
      [disableClose]="disableClose()"
      (closed)="closedCount = closedCount + 1"
    >
      <div modalHeader data-testid="header">Header</div>
      <div data-testid="body">Body</div>
      <div modalFooter data-testid="footer">Footer</div>
    </app-modal>
  `,
})
class HostComponent {
  readonly open = signal(true);
  readonly closeOnBackdrop = signal(false);
  readonly closeOnEscape = signal(true);
  readonly disableClose = signal(false);
  closedCount = 0;
}

function setup() {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

const overlay = (fixture: { nativeElement: HTMLElement }) =>
  fixture.nativeElement.querySelector('.modal-overlay');
const card = (fixture: { nativeElement: HTMLElement }) =>
  fixture.nativeElement.querySelector('.modal-card');

describe('ModalComponent', () => {
  it('renders projected header, body, and footer content', () => {
    const fixture = setup();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[data-testid="header"]')?.textContent).toBe('Header');
    expect(root.querySelector('[data-testid="body"]')?.textContent).toBe('Body');
    expect(root.querySelector('[data-testid="footer"]')?.textContent).toBe('Footer');
  });

  it('renders when open (default)', () => {
    const fixture = setup();
    expect(overlay(fixture)).not.toBeNull();
  });

  it('does not render at all when open is false from the start', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();

    expect(overlay(fixture)).toBeNull();
  });

  it('has role=dialog and aria-modal on the card', () => {
    const fixture = setup();
    const el = card(fixture)!;

    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
  });

  describe('requestClose (always-mounted usage: caller invokes requestClose directly)', () => {
    it('plays the exit animation immediately and emits closed only after the animation completes', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();
        const instance = fixture.debugElement.children[0].componentInstance as ModalComponent;

        instance.requestClose();
        fixture.detectChanges();
        expect(overlay(fixture)?.classList.contains('modal-overlay--closing')).toBe(true);
        expect(fixture.componentInstance.closedCount).toBe(0);

        vi.advanceTimersByTime(300);
        expect(fixture.componentInstance.closedCount).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does nothing when disableClose is true', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();
        fixture.componentInstance.disableClose.set(true);
        fixture.detectChanges();
        const instance = fixture.debugElement.children[0].componentInstance as ModalComponent;

        instance.requestClose();
        vi.advanceTimersByTime(300);

        expect(fixture.componentInstance.closedCount).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('ignores a second requestClose while already closing', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();
        const instance = fixture.debugElement.children[0].componentInstance as ModalComponent;

        instance.requestClose();
        instance.requestClose();
        vi.advanceTimersByTime(300);

        expect(fixture.componentInstance.closedCount).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('[open] input (always-mounted usage: caller toggles a bound flag)', () => {
    it('starts the same exit animation when open flips to false, and emits closed after it completes', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();

        fixture.componentInstance.open.set(false);
        fixture.detectChanges();

        expect(overlay(fixture)?.classList.contains('modal-overlay--closing')).toBe(true);
        expect(fixture.componentInstance.closedCount).toBe(0);

        vi.advanceTimersByTime(300);
        expect(fixture.componentInstance.closedCount).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('unmounts only once the exit animation actually finishes, not immediately on open=false', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();

        fixture.componentInstance.open.set(false);
        fixture.detectChanges();
        vi.advanceTimersByTime(150);

        expect(overlay(fixture)).not.toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('cancels a pending close and does not later emit closed if reopened mid-fade', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();

        fixture.componentInstance.open.set(false);
        fixture.detectChanges();
        vi.advanceTimersByTime(100);

        fixture.componentInstance.open.set(true);
        fixture.detectChanges();

        vi.advanceTimersByTime(1000);
        expect(fixture.componentInstance.closedCount).toBe(0);
        expect(overlay(fixture)?.classList.contains('modal-overlay--closing')).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('actually unmounts the overlay once the close animation finishes — not stuck rendered forever (regression)', () => {
      // Reproduces the real bug: an always-mounted consumer's own `close()`
      // handler re-derives its `[open]` binding from the SAME event this
      // component's (closed) output triggers (e.g. table-form-modal's
      // `(closed)="close()"` -> parent sets `formModalOpen=false` ->
      // `[visible]` flows back into `[open]`). That "echo" of `open()`
      // settling to false *after* the close already finished must not be
      // mistaken for a fresh close request — otherwise the overlay never
      // fully unmounts and permanently blocks clicks on the rest of the page.
      vi.useFakeTimers();
      try {
        const fixture = setup();

        fixture.componentInstance.open.set(false);
        fixture.detectChanges();
        vi.advanceTimersByTime(300);
        fixture.detectChanges();

        expect(overlay(fixture)).toBeNull();
        expect(fixture.componentInstance.closedCount).toBe(1);

        // The echo: something downstream reacting to `closed` re-asserts the
        // already-false `open` value (a no-op in a real app, but exactly
        // what a signal input re-evaluating to the same value looks like).
        fixture.componentInstance.open.set(false);
        fixture.detectChanges();
        vi.advanceTimersByTime(1000);
        fixture.detectChanges();

        expect(overlay(fixture)).toBeNull();
        expect(fixture.componentInstance.closedCount).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('supports opening again after a full close/reopen cycle', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();

        fixture.componentInstance.open.set(false);
        fixture.detectChanges();
        vi.advanceTimersByTime(300);
        fixture.detectChanges();
        expect(overlay(fixture)).toBeNull();

        fixture.componentInstance.open.set(true);
        fixture.detectChanges();

        expect(overlay(fixture)).not.toBeNull();
        expect(overlay(fixture)?.classList.contains('modal-overlay--closing')).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Escape key', () => {
    it('closes on Escape by default', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        vi.advanceTimersByTime(300);

        expect(fixture.componentInstance.closedCount).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not close on Escape when closeOnEscape is false', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();
        fixture.componentInstance.closeOnEscape.set(false);
        fixture.detectChanges();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        vi.advanceTimersByTime(300);

        expect(fixture.componentInstance.closedCount).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not close on Escape when disableClose is true', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();
        fixture.componentInstance.disableClose.set(true);
        fixture.detectChanges();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        vi.advanceTimersByTime(300);

        expect(fixture.componentInstance.closedCount).toBe(0);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('backdrop click', () => {
    it('does not close on backdrop click by default (closeOnBackdrop defaults false)', () => {
      const fixture = setup();

      (overlay(fixture) as HTMLElement).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.closedCount).toBe(0);
    });

    it('closes on backdrop click when closeOnBackdrop is true', () => {
      vi.useFakeTimers();
      try {
        const fixture = setup();
        fixture.componentInstance.closeOnBackdrop.set(true);
        fixture.detectChanges();

        (overlay(fixture) as HTMLElement).click();
        vi.advanceTimersByTime(300);

        expect(fixture.componentInstance.closedCount).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not close when clicking inside the card, even with closeOnBackdrop true', () => {
      const fixture = setup();
      fixture.componentInstance.closeOnBackdrop.set(true);
      fixture.detectChanges();

      (card(fixture) as HTMLElement).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.closedCount).toBe(0);
    });

    it('does not close on backdrop click when disableClose is true', () => {
      const fixture = setup();
      fixture.componentInstance.closeOnBackdrop.set(true);
      fixture.componentInstance.disableClose.set(true);
      fixture.detectChanges();

      (overlay(fixture) as HTMLElement).click();
      fixture.detectChanges();

      expect(fixture.componentInstance.closedCount).toBe(0);
    });
  });
});
