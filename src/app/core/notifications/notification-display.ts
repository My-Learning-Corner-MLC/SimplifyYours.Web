import { NotificationCategory } from './notification-item.model';

export interface NotificationTint {
  readonly icon: string;
  readonly tone: 'success' | 'accent' | 'muted';
}

// Icon per category, matched to the design (Part 05 · Notifications).
const NOTIFICATION_ICONS: Record<NotificationCategory, string> = {
  rsvp: 'pi pi-check',
  order: 'pi pi-shopping-bag',
  reminder: 'pi pi-calendar',
  comment: 'pi pi-comments',
};

/**
 * Icon + color tone for a notification. RSVPs always read as a success
 * (green); everything else reads as "accent" (plum) while unread and fades
 * to "muted" (grey) once read, matching the New/Earlier sections in the design.
 */
export function notificationTint(category: NotificationCategory, unread: boolean): NotificationTint {
  const icon = NOTIFICATION_ICONS[category];
  if (category === 'rsvp') {
    return { icon, tone: 'success' };
  }
  return { icon, tone: unread ? 'accent' : 'muted' };
}
