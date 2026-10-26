import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-form-section',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section class="form-section">
      @if (titleKey()) {
        <div class="form-section__header">
          <h3>{{ titleKey()! | translate }}</h3>
          @if (hintKey()) {
            <p>{{ hintKey()! | translate }}</p>
          }
        </div>
      }
      <ng-content />
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .form-section {
        border: 1px solid var(--surface-border);
        border-radius: 1rem;
        padding: 1.25rem;
        background: var(--surface-ground);
      }

      :host + :host {
        margin-top: 1.5rem;
      }

      .form-section__header {
        margin-bottom: 1rem;
      }

      .form-section__header h3 {
        margin: 0;
        font-size: 1.05rem;
      }

      .form-section__header p {
        margin: 0.35rem 0 0;
        color: var(--text-color-secondary);
        line-height: 1.5;
      }
    `,
  ],
})
export class FormSectionComponent {
  readonly titleKey = input<string | null>(null);
  readonly hintKey = input<string | null>(null);
}
