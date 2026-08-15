import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ConfirmDialog } from './confirm-dialog';

/**
 * "Nothing sent yet" confirmation — shown when no guest currently holds a link, so switching the
 * template has no consequences beyond the choice itself.
 */
@Component({
  selector: 'app-use-template-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialog],
  template: `
    <app-confirm-dialog
      heading="Use this template?"
      primaryLabel="Use template"
      (confirmed)="confirmed.emit()"
      (cancelled)="cancelled.emit()"
    >
      <p>
        {{ templateName() }} will become the invitation design for {{ eventName() }}. You can change
        it any time before you send invitations.
      </p>
    </app-confirm-dialog>
  `,
})
export class UseTemplateConfirmDialog {
  readonly templateName = input.required<string>();
  readonly eventName = input.required<string>();

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
