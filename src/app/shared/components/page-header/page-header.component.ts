import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="page-header">
      <div class="page-header-copy">
        <h1 class="page-title">{{ titleKey() | translate }}</h1>
        @if (subtitleKey()) {
          <p class="page-subtitle">{{ subtitleKey()! | translate }}</p>
        }
      </div>
      <div class="page-header-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .page-title {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 700;
      }

      .page-subtitle {
        margin: 0.35rem 0 0;
        color: var(--text-color-secondary);
        max-width: 46rem;
        line-height: 1.6;
      }

      .page-header-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
    `,
  ],
})
export class PageHeaderComponent {
  readonly titleKey = input.required<string>();
  readonly subtitleKey = input<string | null>(null);
}
