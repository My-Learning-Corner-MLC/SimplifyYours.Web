import { AreaShape } from './area-shape.model';

export type AreaKind = 'Stage' | 'DanceFloor' | 'Bar' | 'Entrance' | 'Buffet' | 'Cake' | 'Custom';

export interface AreaPreset {
  readonly kind: AreaKind;
  readonly label: string;
  readonly defaultShape: AreaShape;
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly defaultColor: string;
}

// Room-fixture presets: the "Drag into the room" palette in the floor-plan
// sidebar (selected-table-panel) creates one of these directly, no modal.
export const AREA_PRESETS: readonly AreaPreset[] = [
  { kind: 'Stage', label: 'Stage', defaultShape: 'Rect', defaultWidth: 3.4, defaultHeight: 0.9, defaultColor: '#5A2849' },
  { kind: 'DanceFloor', label: 'Dance floor', defaultShape: 'Rect', defaultWidth: 2.4, defaultHeight: 2.4, defaultColor: '#C8A876' },
  { kind: 'Bar', label: 'Bar / DJ', defaultShape: 'Rect', defaultWidth: 1.8, defaultHeight: 0.7, defaultColor: '#7A8F5A' },
  { kind: 'Entrance', label: 'Entrance', defaultShape: 'Rect', defaultWidth: 1.2, defaultHeight: 0.4, defaultColor: '#C28840' },
  { kind: 'Buffet', label: 'Buffet', defaultShape: 'Rect', defaultWidth: 2.2, defaultHeight: 0.8, defaultColor: '#E07B5A' },
  { kind: 'Cake', label: 'Cake table', defaultShape: 'Round', defaultWidth: 1, defaultHeight: 1, defaultColor: '#C8A876' },
];

export interface CustomAreaPreset {
  readonly key: string;
  readonly icon: string;
  readonly label: string;
  readonly defaultName: string;
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly defaultColor: string;
}

// One-off / miscellaneous areas offered as quick-start chips in the "Add a
// custom area" modal — distinct from the room-fixture AREA_PRESETS above.
// Every one of these creates a SeatingArea with kind: 'Custom'.
export const CUSTOM_AREA_PRESETS: readonly CustomAreaPreset[] = [
  { key: 'photo-booth', icon: '📷', label: 'Photo booth', defaultName: 'Photo booth', defaultWidth: 2.4, defaultHeight: 1.6, defaultColor: '#EFE3E8' },
  { key: 'gift-table', icon: '🎁', label: 'Gift table', defaultName: 'Gift table', defaultWidth: 1.5, defaultHeight: 0.8, defaultColor: '#F6ECE0' },
  { key: 'kids-corner', icon: '🧸', label: "Kids' corner", defaultName: "Kids' corner", defaultWidth: 2, defaultHeight: 2, defaultColor: '#F4E2DD' },
  { key: 'lounge', icon: '🌿', label: 'Lounge', defaultName: 'Lounge', defaultWidth: 2.5, defaultHeight: 2, defaultColor: '#F0EFE2' },
  { key: 'guest-book', icon: '📖', label: 'Guest book', defaultName: 'Guest book', defaultWidth: 1, defaultHeight: 0.6, defaultColor: '#D7C7E0' },
  { key: 'blank', icon: '+', label: 'Blank', defaultName: '', defaultWidth: 1.5, defaultHeight: 1.5, defaultColor: '#EFE3E8' },
];
