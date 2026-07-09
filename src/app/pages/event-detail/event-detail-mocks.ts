// ---------------------------------------------------------------------------
// MOCK DATA — NOT REAL EVENT DATA.
//
// The Overview tab's "A note on the day", RSVP summary, budget summary,
// "Day of" timeline, and the Dress/Headcount/Planner detail rows are not yet
// backed by a service (guest-management, budget, and day-of "moments" features
// do not exist in the MVP yet). Everything in this file is hard-coded
// placeholder content so the screen renders exactly like the design; it is
// wired to the real APIs once those features ship.
//
// When the backing features ship, delete this file and feed the panels from the
// real APIs. Keeping it isolated makes that removal a single-file change.
// ---------------------------------------------------------------------------

/** "A note on the day" narrative (no event field for this yet). */
export const NOTE_ON_THE_DAY_MOCK =
  'The boat from Bellagio leaves the pier at 4 pm. Ceremony in the rose garden as the sun ' +
  'softens. Dinner under the loggia, dancing on the lawn until late. Guests are welcome to ' +
  'stay over at Villa Astoria — rooms are held under "Whitmore-Hayes."';

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

// NOTE: The Guests tab now loads real data via GuestApiClient (see
// event-detail-page.ts). The former GUESTS_MOCK / GUEST_FILTERS_MOCK /
// GUEST_STATUS_LABEL fixtures were removed when that shipped.

// "Common starting points" chips on the empty-budget state.
export const BUDGET_SUGGESTIONS_MOCK: readonly string[] = [
  'Modest · $2,500',
  'Comfortable · $5,000',
  'Generous · $10,000',
  'Custom →',
];
