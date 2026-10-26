import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-page-state',
  standalone: true,
  imports: [TranslatePipe, ProgressSpinnerModule],
  template: `
    @if (loading()) {
      <div class="page-state page-state--loading">
        <p-progressSpinner strokeWidth="4" />
        <span>{{ (loadingKey() || 'common.loading') | translate }}</span>
      </div>
    } @else if (error()) {
      <div class="page-state page-state--error">{{ error() }}</div>
    } @else if (empty()) {
      <div class="page-state page-state--empty">
        {{ (emptyKey() || 'common.no_data') | translate }}
      </div>
    } @else {
      <ng-content />
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .page-state {
        min-height: 12rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        text-align: center;
        color: var(--text-color-secondary);
        padding: 2rem;
      }

      .page-state--error {
        color: var(--danger-color);
      }
    `,
  ],
})
export class PageStateComponent {
  readonly loading = input(false);
  readonly empty = input(false);
  readonly error = input<string | null>(null);
  readonly loadingKey = input<string | null>(null);
  readonly emptyKey = input<string | null>(null);
}
