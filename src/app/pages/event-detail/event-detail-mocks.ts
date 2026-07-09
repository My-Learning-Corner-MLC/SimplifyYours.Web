// ---------------------------------------------------------------------------
// SAMPLE / MOCK DATA — NOT REAL EVENT DATA.
//
// The Overview tab's RSVP summary, budget summary, "Day of" timeline, and the
// Dress/Headcount/Planner detail rows are designed here but not yet backed by a
// service (guest-management, budget, and day-of "moments" features do not exist
// in the MVP yet). Everything in this file is hard-coded placeholder content so
// the screen matches the design; the UI tags it visibly as a sample so an
// organizer never mistakes it for their real numbers.
//
// When the backing features ship, delete this file and feed the panels from the
// real APIs. Keeping it isolated makes that removal a single-file change.
// ---------------------------------------------------------------------------

/** Banner copy shown wherever sample data is rendered. */
export const SAMPLE_DATA_NOTE = 'Sample preview — live data arrives when this area is wired up.';

export interface RsvpSummaryMock {
  readonly confirmed: number;
  readonly declined: number;
  readonly awaiting: number;
  readonly invited: number;
}

export const RSVP_SUMMARY_MOCK: RsvpSummaryMock = {
  confirmed: 96,
  declined: 14,
  awaiting: 32,
  invited: 142,
};

export interface BudgetSummaryMock {
  readonly spent: number;
  readonly total: number;
  readonly currency: string;
}

export const BUDGET_SUMMARY_MOCK: BudgetSummaryMock = {
  spent: 42140,
  total: 86400,
  currency: 'EUR',
};

export interface DayOfMomentMock {
  readonly time: string;
  readonly title: string;
  readonly detail: string;
}

export const DAY_OF_MOMENTS_MOCK: readonly DayOfMomentMock[] = [
  { time: '16:00', title: 'Boat departs Bellagio pier', detail: '15 min crossing — board by 15:45' },
  { time: '17:00', title: 'Cocktails — lower terrace', detail: 'Aperol spritz, prosecco, canapés' },
  { time: '18:30', title: 'Ceremony — rose garden', detail: '25 minutes. Officiant: Camilla Russo' },
  { time: '19:30', title: 'Dinner — under the loggia', detail: 'Five courses. Seating in Guests tab.' },
  { time: '22:00', title: 'Dancing — on the lawn', detail: 'DJ until late' },
];

export interface DetailRowMock {
  readonly label: string;
  readonly value: string;
}

// Secondary "The details" rows that have no data source yet. Venue is NOT here —
// it comes from the event's real `location`.
export const DETAIL_ROWS_MOCK: readonly DetailRowMock[] = [
  { label: 'Dress', value: 'Black tie' },
  { label: 'Headcount', value: '142 invited' },
  { label: 'Planner', value: 'Eleanor Whitmore' },
];
