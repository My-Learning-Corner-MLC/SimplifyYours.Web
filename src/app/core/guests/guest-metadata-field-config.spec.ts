import { guestMetadataFieldsFor } from './guest-metadata-field-config';

describe('guestMetadataFieldsFor', () => {
  it('returns all five fields for wedding events', () => {
    expect(guestMetadataFieldsFor('wedding')).toEqual([
      'relationship',
      'side',
      'tags',
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
