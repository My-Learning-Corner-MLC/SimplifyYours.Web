import { CanDeactivateFn } from '@angular/router';

import { CreateEventPage } from './create-event-page';

export const createEventLeaveGuard: CanDeactivateFn<CreateEventPage> = (component) =>
  component.confirmLeave();
