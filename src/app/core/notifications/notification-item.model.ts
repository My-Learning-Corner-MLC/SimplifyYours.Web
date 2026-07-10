export type NotificationCategory = 'rsvp' | 'order' | 'reminder' | 'comment';

export interface NotificationItem {
  readonly id: string;
  readonly category: NotificationCategory;
  // Static, developer-authored markup only (e.g. `<span class="...">Name</span>`)
  // for the bold-name emphasis the design calls for — never user input.
  readonly message: string;
  readonly timestamp: string;
  readonly unread: boolean;
}
