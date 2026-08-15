import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ConfirmDialog } from './confirm-dialog';

/**
 * Shown instead of {@link UseTemplateConfirmDialog} once at least one guest already has an
 * invitation link — switching the template changes what they see the next time they open it.
 */
@Component({
  selector: 'app-change-template-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      heading="Change template?"
      primaryLabel="Continue"
      [warning]="true"
      (confirmed)="confirmed.emit()"
      (cancelled)="cancelled.emit()"
    >
      <p>
        <strong>{{ guestCount() }} guests</strong> already have invitation links — they'll see the
        new {{ templateName() }} design when they open them. Continue?
      </p>
    </app-confirm-dialog>
  `,
})
export class ChangeTemplateConfirmDialog {
  readonly templateName = input.required<string>();
  readonly guestCount = input.required<number>();

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
