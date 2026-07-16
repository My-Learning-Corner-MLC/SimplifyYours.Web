import { TestBed } from '@angular/core/testing';

import { SegmentedControlComponent } from './segmented-control.component';

type Option = 'Family' | 'Friend' | 'Colleague';
const OPTIONS: readonly Option[] = ['Family', 'Friend', 'Colleague'];

function setup(overrides: Partial<Record<string, unknown>> = {}) {
  TestBed.configureTestingModule({ imports: [SegmentedControlComponent] });
  const fixture = TestBed.createComponent(SegmentedControlComponent<Option>);
  fixture.componentRef.setInput('options', OPTIONS);
  fixture.componentRef.setInput('ariaLabel', 'Relationship');
  fixture.componentRef.setInput('value', overrides['value'] ?? 'Family');
  if ('disabled' in overrides) {
    fixture.componentRef.setInput('disabled', overrides['disabled']);
  }
  if ('getLabel' in overrides) {
    fixture.componentRef.setInput('getLabel', overrides['getLabel']);
  }
  fixture.detectChanges();
  return fixture;
}

const buttons = (fixture: { nativeElement: HTMLElement }) =>
  Array.from(fixture.nativeElement.querySelectorAll<HTMLButtonElement>('.sc-option'));

describe('SegmentedControlComponent', () => {
  it('renders one option per entry, in order', () => {
    const fixture = setup();
    const labels = buttons(fixture).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Family', 'Friend', 'Colleague']);
  });

  it('marks the active option via class and aria-checked', () => {
    const fixture = setup({ value: 'Friend' });
    const active = buttons(fixture).find((b) => b.getAttribute('aria-checked') === 'true');
    expect(active?.textContent?.trim()).toBe('Friend');
    expect(active?.classList.contains('sc-option--active')).toBe(true);
  });

  it('positions the slider under the active option', () => {
    const fixture = setup({ value: 'Colleague' });
    const pill = fixture.nativeElement.querySelector('.sc-pill') as HTMLElement;
    expect(pill.style.getPropertyValue('--sc-index')).toBe('2');
  });

  it('emits valueChange when a different option is clicked', () => {
    const fixture = setup({ value: 'Family' });
    const emitted: Option[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));

    buttons(fixture)[1].click();

    expect(emitted).toEqual(['Friend']);
  });

  it('does not emit when the active option is clicked again', () => {
    const fixture = setup({ value: 'Family' });
    const emitted: Option[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));

    buttons(fixture)[0].click();

    expect(emitted).toEqual([]);
  });

  it('does not emit when disabled', () => {
    const fixture = setup({ value: 'Family', disabled: true });
    const emitted: Option[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));

    buttons(fixture)[1].click();

    expect(emitted).toEqual([]);
    expect(buttons(fixture).every((b) => b.disabled)).toBe(true);
  });

  it('moves selection with ArrowRight and wraps at the end', () => {
    const fixture = setup({ value: 'Colleague' });
    const emitted: Option[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));

    fixture.componentInstance.onKeydown(
      new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      2,
    );

    expect(emitted).toEqual(['Family']);
  });

  it('moves selection with ArrowLeft and wraps at the start', () => {
    const fixture = setup({ value: 'Family' });
    const emitted: Option[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));

    fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }), 0);

    expect(emitted).toEqual(['Colleague']);
  });

  it('jumps to the first/last option with Home/End', () => {
    const fixture = setup({ value: 'Friend' });
    const emitted: Option[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));

    fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'End' }), 1);
    fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'Home' }), 1);

    expect(emitted).toEqual(['Colleague', 'Family']);
  });

  it('applies a custom label formatter', () => {
    const fixture = setup({ getLabel: (option: Option) => `${option}!` });
    const labels = buttons(fixture).map((b) => b.textContent?.trim());
    expect(labels).toEqual(['Family!', 'Friend!', 'Colleague!']);
  });

  it('ignores unrelated keys', () => {
    const fixture = setup({ value: 'Family' });
    const emitted: Option[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));

    fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 0);

    expect(emitted).toEqual([]);
  });
});
