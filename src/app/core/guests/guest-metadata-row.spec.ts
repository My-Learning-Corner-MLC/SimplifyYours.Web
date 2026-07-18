import { describeGuestMetadata } from './guest-metadata-row';

describe('describeGuestMetadata', () => {
  it('builds a possessive-side group label for wedding events', () => {
    const info = describeGuestMetadata('wedding', {
      relationship: 'Family',
      side: 'Bride',
      plusOnes: 2,
      dietaryNotes: 'Vegan',
    });

    expect(info.group).toBe("Family · bride's side");
    expect(info.plusOnes).toBe(2);
    expect(info.dietaryNotes).toBe('Vegan');
  });

  it('has no group text for birthday events', () => {
    const info = describeGuestMetadata('birthday', { plusOnes: 3, dietaryNotes: 'Nut allergy' });

    expect(info.group).toBe('');
    expect(info.plusOnes).toBe(3);
    expect(info.dietaryNotes).toBe('Nut allergy');
  });

  it('returns empty info for event types with no registered mapper', () => {
    const info = describeGuestMetadata('launch', { plusOnes: 5 });

    expect(info).toEqual({ group: '', plusOnes: 0, dietaryNotes: null });
  });

  it('returns empty info when eventMetadata is null', () => {
    expect(describeGuestMetadata('wedding', null)).toEqual({
      group: '',
      plusOnes: 0,
      dietaryNotes: null,
    });
  });
});
