import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';

export type StatCardTone = 'primary' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CardModule, TranslatePipe],
  template: `
    <p-card styleClass="stat-card">
      <div class="stat-content">
        @if (icon()) {
          <i class="stat-icon" [class]="icon()!" [attr.data-tone]="tone()"></i>
        }
        <div>
          <span class="stat-value">{{ value() }}</span>
          <span class="stat-label">{{ labelKey() ? (labelKey()! | translate) : label() }}</span>
        </div>
      </div>
    </p-card>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      :host ::ng-deep .p-card-body,
      :host ::ng-deep .p-card-content {
        padding: 1rem;
      }

      .stat-content {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .stat-icon {
        font-size: 2rem;
        opacity: 0.9;
      }

      .stat-icon[data-tone='primary'] { color: var(--primary-color); }
      .stat-icon[data-tone='success'] { color: var(--success-color); }
      .stat-icon[data-tone='warning'] { color: var(--warning-color); }
      .stat-icon[data-tone='danger'] { color: var(--danger-color); }
      .stat-icon[data-tone='info'] { color: var(--info-color); }

      .stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-color);
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--text-color-secondary);
      }
    `,
  ],
})
export class StatCardComponent {
  readonly icon = input<string | null>(null);
  readonly value = input<string | number>('');
  readonly labelKey = input<string | null>(null);
  readonly label = input<string | null>(null);
  readonly tone = input<StatCardTone>('primary');
}
