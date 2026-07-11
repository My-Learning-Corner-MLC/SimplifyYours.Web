export type AreaKind = 'Stage' | 'DanceFloor' | 'Bar' | 'Entrance' | 'Buffet' | 'Cake' | 'Custom';

export interface AreaPreset {
  readonly kind: AreaKind;
  readonly label: string;
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly defaultColor: string;
}

// Default footprint (metres) and swatch shown in the room-element palette and
// the custom-area modal's preset chips.
export const AREA_PRESETS: readonly AreaPreset[] = [
  { kind: 'Stage', label: 'Stage', defaultWidth: 3.4, defaultHeight: 0.9, defaultColor: '#5A2849' },
  { kind: 'DanceFloor', label: 'Dance floor', defaultWidth: 2.4, defaultHeight: 2.4, defaultColor: '#C8A876' },
  { kind: 'Bar', label: 'Bar / DJ', defaultWidth: 1.8, defaultHeight: 0.7, defaultColor: '#7A8F5A' },
  { kind: 'Entrance', label: 'Entrance', defaultWidth: 1.2, defaultHeight: 0.4, defaultColor: '#C28840' },
  { kind: 'Buffet', label: 'Buffet', defaultWidth: 2.2, defaultHeight: 0.8, defaultColor: '#E07B5A' },
  { kind: 'Cake', label: 'Cake table', defaultWidth: 1, defaultHeight: 1, defaultColor: '#C8A876' },
  { kind: 'Custom', label: 'Custom area', defaultWidth: 1.5, defaultHeight: 1.5, defaultColor: '#EFE3E8' },
];
