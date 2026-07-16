import { guestMetadataFieldsFor } from './guest-metadata-field-config';

describe('guestMetadataFieldsFor', () => {
  it('returns all four fields for wedding events', () => {
    expect(guestMetadataFieldsFor('wedding')).toEqual([
      'relationship',
      'side',
      'plusOnes',
      'dietaryNotes',
    ]);
  });

  it('returns only plusOnes/dietaryNotes for birthday events', () => {
    expect(guestMetadataFieldsFor('birthday')).toEqual(['plusOnes', 'dietaryNotes']);
  });

  it('returns no fields for event types with no registered mapper', () => {
    expect(guestMetadataFieldsFor('launch')).toEqual([]);
    expect(guestMetadataFieldsFor('')).toEqual([]);
  });
});
