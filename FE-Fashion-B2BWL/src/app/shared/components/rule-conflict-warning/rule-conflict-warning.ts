import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiNotification } from '@taiga-ui/core';

@Component({
  selector: 'app-rule-conflict-warning',
  standalone: true,
  imports: [CommonModule, TuiNotification],
  template: `
    <div *ngFor="let msg of conflicts" style="margin-bottom: 12px;">
      <tui-notification
        [appearance]="getAppearance(msg)"
      >
        {{ msg }}
      </tui-notification>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleConflictWarningComponent {
  @Input() conflicts: string[] = [];

  getAppearance(msg: string): 'warning' | 'error' | 'info' {
    if (msg.startsWith('BLOCKED')) return 'error';
    if (msg.startsWith('CRITICAL')) return 'error';
    if (msg.startsWith('WARNING')) return 'warning';
    return 'info';
  }
}
