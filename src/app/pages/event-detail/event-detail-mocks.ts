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

export type GuestStatus = 'confirmed' | 'awaiting' | 'declined';

export interface GuestMock {
  readonly initial: string;
  readonly name: string;
  readonly group: string;
  readonly email: string;
  readonly party: string;
  readonly status: GuestStatus;
  readonly meal: string | null;
  readonly table: string | null;
  readonly avatarBg: string;
}

// Fictional sample guests, mirroring the design's Guests tab. NOT real people —
// no real guest PII is involved; guest-management-service is untouched.
export const GUESTS_MOCK: readonly GuestMock[] = [
  {
    initial: 'R',
    name: 'Sir Reginald Ashworth',
    group: "Family · groom's side",
    email: 'reginald@ashworth.co.uk',
    party: '+1 · Lady Ashworth',
    status: 'confirmed',
    meal: 'Pescatarian',
    table: 'T·04',
    avatarBg: '#f0d9b8',
  },
  {
    initial: 'C',
    name: 'Mrs. Cordelia Bennett-Park',
    group: "Friend · bride's side",
    email: 'c.bennett@gmail.com',
    party: 'Solo',
    status: 'confirmed',
    meal: null,
    table: 'T·02',
    avatarBg: '#e8c9d8',
  },
  {
    initial: 'F',
    name: 'Dr. & Mr. Marchetti',
    group: "Colleague · bride's side",
    email: 'f.marchetti@uni.it',
    party: 'Party of 2',
    status: 'awaiting',
    meal: null,
    table: null,
    avatarBg: '#d8e0c4',
  },
  {
    initial: 'J',
    name: 'The Hon. Julian Carstairs',
    group: "Family · groom's side",
    email: 'julian.c@me.com',
    party: '+1 · TBC',
    status: 'declined',
    meal: null,
    table: null,
    avatarBg: '#e5d3c0',
  },
  {
    initial: 'I',
    name: 'Ms. Imani Okafor-Hill',
    group: "Friend · bride's side",
    email: 'imani@okaforhill.com',
    party: '+1 · S. Hill',
    status: 'confirmed',
    meal: 'Vegan',
    table: 'T·07',
    avatarBg: '#d9cbe0',
  },
  {
    initial: 'K',
    name: 'Mr. & Mrs. Kavanagh',
    group: "Family · bride's side",
    email: 't.kavanagh@home.com',
    party: 'Party of 2',
    status: 'confirmed',
    meal: 'Gluten-free',
    table: 'T·04',
    avatarBg: '#f0d9b8',
  },
];

export interface GuestFilterMock {
  readonly label: string;
  readonly count: number;
}

// Totals from the design (the full 142-guest list; only a sample renders above).
export const GUEST_FILTERS_MOCK: readonly GuestFilterMock[] = [
  { label: 'All', count: 142 },
  { label: 'Confirmed', count: 96 },
  { label: 'Awaiting', count: 32 },
  { label: 'Declined', count: 14 },
];

export const GUEST_STATUS_LABEL: Record<GuestStatus, string> = {
  confirmed: '● Confirmed',
  awaiting: '○ Awaiting',
  declined: '✕ Declined',
};

// "Common starting points" chips on the empty-budget state.
export const BUDGET_SUGGESTIONS_MOCK: readonly string[] = [
  'Modest · $2,500',
  'Comfortable · $5,000',
  'Generous · $10,000',
  'Custom →',
];
