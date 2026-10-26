import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="field">
      @if (labelKey() || label()) {
        <label class="field-label" [attr.for]="forId() || null">
          {{ labelKey() ? (labelKey()! | translate) : label() }}
          @if (required()) {
            <span class="required">*</span>
          }
        </label>
      }
      <ng-content />
      @if (errorKey() || error()) {
        <small class="p-error">{{ errorKey() ? (errorKey()! | translate) : error() }}</small>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .field-label {
        display: inline-block;
        margin-bottom: 0.5rem;
        font-weight: 600;
      }

      .required {
        color: var(--danger-color);
        margin-inline-start: 0.15rem;
      }

      .p-error {
        display: block;
        margin-top: 0.35rem;
      }

      :host ::ng-deep input,
      :host ::ng-deep textarea,
      :host ::ng-deep .p-dropdown,
      :host ::ng-deep .p-multiselect,
      :host ::ng-deep .p-calendar,
      :host ::ng-deep .p-password,
      :host ::ng-deep .p-inputnumber {
        width: 100%;
      }
    `,
  ],
})
export class FormFieldComponent {
  readonly forId = input<string | null>(null);
  readonly labelKey = input<string | null>(null);
  readonly label = input<string | null>(null);
  readonly required = input(false);
  readonly errorKey = input<string | null>(null);
  readonly error = input<string | null>(null);
}
