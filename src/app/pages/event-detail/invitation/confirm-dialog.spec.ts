import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';

import { ConfirmDialog } from './confirm-dialog';

@Component({
  standalone: true,
  imports: [ConfirmDialog],
  template: `
    <button type="button" id="trigger">open</button>
    @if (open()) {
      <app-confirm-dialog
        heading="Use this template?"
        primaryLabel="Use template"
        [danger]="danger()"
        (confirmed)="confirmed()"
        (cancelled)="close()"
      >
        <p>Body copy</p>
      </app-confirm-dialog>
    }
  `,
})
class HostComponent {
  readonly open = signal(false);
  readonly danger = signal(false);
  readonly onConfirmed = vi.fn();

  confirmed(): void {
    this.onConfirmed();
    this.open.set(false);
  }

  close(): void {
    this.open.set(false);
  }
}

describe('ConfirmDialog', () => {
  async function render(): Promise<ComponentFixture<HostComponent>> {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders alertdialog semantics with aria-label and aria-describedby', async () => {
    const fixture = await render();
    (fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement).focus();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = fixture.nativeElement.querySelector('[role="alertdialog"]');
    expect(dialog.getAttribute('aria-label')).toBe('Use this template?');
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-dialog-body');
  });

  it('moves focus to the heading on open', async () => {
    const fixture = await render();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement?.className).toContain('confirm-dialog__heading');
  });

  it('returns focus to the trigger on cancel', async () => {
    const fixture = await render();
    const trigger = fixture.nativeElement.querySelector('#trigger') as HTMLButtonElement;
    trigger.focus();

    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.confirm-dialog__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(trigger);
  });

  it('escape cancels rather than dismissing via a scrim click', async () => {
    const fixture = await render();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    // The scrim has no click handler at all — clicking it must not close the dialog.
    (fixture.nativeElement.querySelector('.confirm-dialog__scrim') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).not.toBeNull();

    const dialog = fixture.nativeElement.querySelector('.confirm-dialog') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('confirming emits confirmed', async () => {
    const fixture = await render();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.confirm-dialog__primary') as HTMLButtonElement).click();

    expect(fixture.componentInstance.onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('defaults to the solid primary / plain secondary treatment', async () => {
    const fixture = await render();
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('.confirm-dialog__primary')?.classList.contains(
        'confirm-dialog__primary--outline',
      ),
    ).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.confirm-dialog__secondary')?.classList.contains(
        'confirm-dialog__secondary--solid',
      ),
    ).toBe(false);
  });

  it('swaps to an outlined primary / solid secondary when danger is set, like create-event\'s discard dialog', async () => {
    const fixture = await render();
    fixture.componentInstance.danger.set(true);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('.confirm-dialog__primary')?.classList.contains(
        'confirm-dialog__primary--outline',
      ),
    ).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.confirm-dialog__secondary')?.classList.contains(
        'confirm-dialog__secondary--solid',
      ),
    ).toBe(true);
  });
});
