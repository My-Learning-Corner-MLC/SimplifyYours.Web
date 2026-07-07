import {
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABELS,
  eventTypeEmoji,
  eventTypeLabel,
} from './event-type-display';

describe('eventTypeLabel', () => {
  it('returns the known label for a known type', () => {
    expect(eventTypeLabel('birthday')).toBe('Birthday');
    expect(eventTypeLabel('WEDDING')).toBe('Wedding');
  });

  it('title-cases an unknown type instead of crashing', () => {
    expect(eventTypeLabel('gala')).toBe('Gala');
  });

  it('humanises separators in an unknown type', () => {
    expect(eventTypeLabel('team_offsite')).toBe('Team offsite');
  });

  it('falls back to a neutral word for an empty type', () => {
    expect(eventTypeLabel('   ')).toBe('Occasion');
  });
});

describe('eventTypeEmoji', () => {
  it('returns the known emoji for a known type', () => {
    expect(eventTypeEmoji('launch')).toBe(EVENT_TYPE_EMOJI.launch);
  });

  it('returns a neutral sparkle for an unknown type', () => {
    expect(eventTypeEmoji('gala')).toBe('✨');
  });
});

describe('EVENT_TYPE_LABELS', () => {
  it('covers every creatable type with a non-empty label', () => {
    for (const label of Object.values(EVENT_TYPE_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
