import { notificationTint } from './notification-display';

describe('notificationTint', () => {
  it('always reads RSVPs as success, regardless of read state', () => {
    expect(notificationTint('rsvp', true)).toEqual({ icon: 'pi pi-check', tone: 'success' });
    expect(notificationTint('rsvp', false)).toEqual({ icon: 'pi pi-check', tone: 'success' });
  });

  it('reads unread non-RSVP notifications as accent', () => {
    expect(notificationTint('order', true)).toEqual({ icon: 'pi pi-shopping-bag', tone: 'accent' });
  });

  it('reads read non-RSVP notifications as muted', () => {
    expect(notificationTint('reminder', false)).toEqual({ icon: 'pi pi-calendar', tone: 'muted' });
    expect(notificationTint('comment', false)).toEqual({ icon: 'pi pi-comments', tone: 'muted' });
  });
});
