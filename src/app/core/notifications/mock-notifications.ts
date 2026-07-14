import { NotificationItem } from './notification-item.model';

// Placeholder feed until a real notification service exists — mirrors the
// content shown in the approved design (Part 05 · Notifications).
export const MOCK_NOTIFICATIONS: readonly NotificationItem[] = [
  {
    id: 'rsvp-marcus-cole',
    category: 'rsvp',
    message:
      '<span class="site-header__notification-emphasis">Marcus Cole</span> RSVP\'d yes to ' +
      '<span class="site-header__notification-emphasis">Lake Como Wedding</span>',
    timestamp: '2 MIN AGO',
    unread: true,
  },
  {
    id: 'order-bloom-co',
    category: 'order',
    message:
      '<span class="site-header__notification-emphasis">Bloom &amp; Co.</span> confirmed your floral order',
    timestamp: '1 HR AGO',
    unread: true,
  },
  {
    id: 'reminder-autumn-gala',
    category: 'reminder',
    message:
      'Your occasion <span class="site-header__notification-emphasis">Autumn Gala</span> starts in 3 days',
    timestamp: '1 DAY AGO',
    unread: false,
  },
  {
    id: 'comment-priya-nair',
    category: 'comment',
    message:
      '<span class="site-header__notification-emphasis">Priya Nair</span> left a note on your seating chart',
    timestamp: '2 DAYS AGO',
    unread: false,
  },
];
