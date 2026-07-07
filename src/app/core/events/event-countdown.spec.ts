import { dayOffset, describeCountdown, formatEventWhen } from './event-countdown';

describe('describeCountdown', () => {
  const now = new Date('2026-07-07T09:00:00');

  const at = (iso: string) => describeCountdown(iso, now);

  it('labels an event on the same calendar day as TODAY', () => {
    const result = at('2026-07-07T20:00:00');
    expect(result.label).toBe('TODAY');
    expect(result.tone).toBe('today');
    expect(result.dayOffset).toBe(0);
  });

  it('labels an event tomorrow as a single day', () => {
    const result = at('2026-07-08T09:00:00');
    expect(result.label).toBe('T − 1 DAY');
    expect(result.tone).toBe('future');
  });

  it('uses days up to the 21-day threshold', () => {
    expect(at('2026-07-28T09:00:00').label).toBe('T − 21 DAYS');
  });

  it('switches to weeks beyond 21 days', () => {
    // 28 days out -> 4 weeks
    expect(at('2026-08-04T09:00:00').label).toBe('T − 4 WEEKS');
  });

  it('labels past events with an AGO suffix', () => {
    const result = at('2026-07-04T09:00:00');
    expect(result.label).toBe('3 DAYS AGO');
    expect(result.tone).toBe('past');
    expect(result.dayOffset).toBe(-3);
  });

  it('uses weeks for events well in the past', () => {
    expect(at('2026-06-01T09:00:00').label).toMatch(/WEEKS AGO$/);
  });

  it('ignores the time of day when computing whole-day offsets', () => {
    // 23:59 today vs 09:00 now is still the same calendar day.
    expect(dayOffset('2026-07-07T23:59:00', now)).toBe(0);
  });
});

describe('formatEventWhen', () => {
  it('formats a valid ISO timestamp into a readable line', () => {
    const label = formatEventWhen('2026-07-05T14:00:00');
    expect(label).toMatch(/2026/);
    expect(label).toMatch(/Jul/);
  });

  it('returns an empty string for an unparseable value', () => {
    expect(formatEventWhen('not-a-date')).toBe('');
  });

  it('renders a start–end time range when both are provided', () => {
    const label = formatEventWhen(
      '2026-07-05T14:00:00Z',
      '2026-07-05T14:00:00Z',
      '2026-07-05T18:00:00Z',
    );
    expect(label).toContain('–');
  });

  it('falls back to the single event time when there is no end time', () => {
    const label = formatEventWhen('2026-07-05T14:00:00Z', '2026-07-05T14:00:00Z', null);
    expect(label).not.toContain('–');
    expect(label).toMatch(/2026/);
  });
});
