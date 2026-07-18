import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SeatingArea } from '../../../../core/seating/seating-area.model';
import { SeatingStore } from '../../../../core/seating/seating-store';
import { CustomAreaModalComponent } from './custom-area-modal.component';

function makeArea(overrides: Partial<SeatingArea> = {}): SeatingArea {
  return {
    id: 'a1',
    name: 'Photo booth',
    kind: 'Custom',
    shape: 'Rect',
    width: 2.4,
    height: 1.6,
    positionX: null,
    positionY: null,
    rotation: 0,
    color: '#EFE3E8',
    capacity: null,
    ...overrides,
  };
}

function setup(store: Partial<SeatingStore>) {
  TestBed.configureTestingModule({
    imports: [CustomAreaModalComponent],
    providers: [{ provide: SeatingStore, useValue: store }],
  });
  const fixture = TestBed.createComponent(CustomAreaModalComponent);
  fixture.componentInstance.visible = true;
  fixture.componentInstance.ngOnChanges({
    visible: { currentValue: true, previousValue: false, firstChange: true, isFirstChange: () => true },
  });
  fixture.detectChanges();
  return fixture;
}

describe('CustomAreaModalComponent', () => {
  it('defaults to create mode with an empty form', () => {
    const fixture = setup({});
    const c = fixture.componentInstance;

    expect(c.isEditMode).toBe(false);
    expect(c.form.controls.name.value).toBe('');
    expect(c.form.controls.kind.value).toBe('Custom');
    expect(c.form.controls.shape.value).toBe('Rect');
    expect(c.form.controls.capacity.value).toBeNull();
  });

  it('pre-fills the form in edit mode from the given area, preserving a non-Custom kind', () => {
    const fixture = setup({});
    fixture.componentInstance.area = makeArea({ name: 'Stage', kind: 'Stage', shape: 'Rect', width: 3.4, height: 0.9 });
    fixture.componentInstance.ngOnChanges({
      visible: { currentValue: true, previousValue: true, firstChange: false, isFirstChange: () => false },
    });

    const c = fixture.componentInstance;
    expect(c.isEditMode).toBe(true);
    expect(c.form.controls.name.value).toBe('Stage');
    expect(c.form.controls.kind.value).toBe('Stage');
    expect(c.form.controls.width.value).toBe(3.4);
  });

  describe('presets', () => {
    it('applies a preset: name, width, height, colour, and always kind Custom', () => {
      const fixture = setup({});
      const preset = fixture.componentInstance.presets.find((p) => p.key === 'kids-corner')!;

      fixture.componentInstance.applyPreset(preset);

      const c = fixture.componentInstance;
      expect(c.form.controls.name.value).toBe(preset.defaultName);
      expect(c.form.controls.width.value).toBe(preset.defaultWidth);
      expect(c.form.controls.height.value).toBe(preset.defaultHeight);
      expect(c.form.controls.color.value).toBe(preset.defaultColor);
      expect(c.form.controls.kind.value).toBe('Custom');
      expect(c.isPresetSelected(preset)).toBe(true);
    });

    it('the Blank preset clears the name instead of filling it in', () => {
      const fixture = setup({});
      const blank = fixture.componentInstance.presets.find((p) => p.key === 'blank')!;
      fixture.componentInstance.form.controls.name.setValue('Leftover text');

      fixture.componentInstance.applyPreset(blank);

      expect(fixture.componentInstance.form.controls.name.value).toBe('');
    });
  });

  it('selectColor updates the colour control', () => {
    const fixture = setup({});

    fixture.componentInstance.selectColor('#F6ECE0');

    expect(fixture.componentInstance.form.controls.color.value).toBe('#F6ECE0');
  });

  describe('capacity stepper', () => {
    it('increments from N/A (null) to 1', () => {
      const fixture = setup({});

      fixture.componentInstance.changeCapacity(1);

      expect(fixture.componentInstance.form.controls.capacity.value).toBe(1);
      expect(fixture.componentInstance.capacityDisplay).toBe('1');
    });

    it('decrementing back to zero returns to N/A (null), not 0', () => {
      const fixture = setup({});
      fixture.componentInstance.changeCapacity(1);

      fixture.componentInstance.changeCapacity(-1);

      expect(fixture.componentInstance.form.controls.capacity.value).toBeNull();
      expect(fixture.componentInstance.capacityDisplay).toBe('—');
    });

    it('does not go negative', () => {
      const fixture = setup({});

      fixture.componentInstance.changeCapacity(-1);

      expect(fixture.componentInstance.form.controls.capacity.value).toBeNull();
    });
  });

  describe('submit', () => {
    it('does not call the store when the name is blank', () => {
      const createArea = vi.fn();
      const fixture = setup({ createArea });

      fixture.componentInstance.submit();

      expect(createArea).not.toHaveBeenCalled();
    });

    it('creates the area with the form values in create mode', () => {
      const createArea = vi.fn(() => of(makeArea()));
      const fixture = setup({ createArea });
      fixture.componentInstance.form.setValue({
        name: 'Photo booth',
        kind: 'Custom',
        shape: 'Rect',
        width: 2.4,
        height: 1.6,
        color: '#EFE3E8',
        capacity: null,
      });

      fixture.componentInstance.submit();

      expect(createArea).toHaveBeenCalledWith({
        name: 'Photo booth',
        kind: 'Custom',
        shape: 'Rect',
        width: 2.4,
        height: 1.6,
        color: '#EFE3E8',
        capacity: null,
      });
    });

    it('updates the area in edit mode', () => {
      const updateArea = vi.fn(() => of(makeArea()));
      const fixture = setup({ updateArea });
      fixture.componentInstance.area = makeArea({ id: 'a9' });
      fixture.componentInstance.ngOnChanges({
        visible: { currentValue: true, previousValue: true, firstChange: false, isFirstChange: () => false },
      });

      fixture.componentInstance.submit();

      expect(updateArea).toHaveBeenCalledWith('a9', expect.objectContaining({ name: 'Photo booth' }));
    });

    it('emits closed on success', () => {
      const createArea = vi.fn(() => of(makeArea()));
      const fixture = setup({ createArea });
      fixture.componentInstance.form.controls.name.setValue('Photo booth');
      const spy = vi.fn();
      fixture.componentInstance.closed.subscribe(spy);

      fixture.componentInstance.submit();

      expect(spy).toHaveBeenCalledOnce();
      expect(fixture.componentInstance.saving()).toBe(false);
    });

    it('shows a friendly error and does not close on failure', () => {
      const createArea = vi.fn(() => throwError(() => new Error('boom')));
      const fixture = setup({ createArea });
      fixture.componentInstance.form.controls.name.setValue('Photo booth');
      const spy = vi.fn();
      fixture.componentInstance.closed.subscribe(spy);

      fixture.componentInstance.submit();

      expect(spy).not.toHaveBeenCalled();
      expect(fixture.componentInstance.error()).toBe("Couldn't save the area. Please try again.");
      expect(fixture.componentInstance.saving()).toBe(false);
    });
  });

  it('close emits closed when not saving', () => {
    const fixture = setup({});
    const spy = vi.fn();
    fixture.componentInstance.closed.subscribe(spy);

    fixture.componentInstance.close();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('close does nothing while saving', () => {
    const fixture = setup({});
    fixture.componentInstance.saving.set(true);
    const spy = vi.fn();
    fixture.componentInstance.closed.subscribe(spy);

    fixture.componentInstance.close();

    expect(spy).not.toHaveBeenCalled();
  });
});
