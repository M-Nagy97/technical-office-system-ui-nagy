import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { BUTTON_PRESET_CLASS } from '../../ui/button-presets';

@Component({
  selector: 'app-form-actions',
  standalone: true,
  imports: [RouterLink, TranslatePipe, ButtonModule],
  host: {
    '[class.flush]': 'flush()',
  },
  template: `
    <div class="form-actions">
      @if (showCancel()) {
        @if (cancelLink()) {
          <a
            pButton
            type="button"
            [routerLink]="cancelCommands"
            [icon]="cancelIcon() || ''"
            [label]="(cancelLabelKey() || 'common.cancel') | translate"
            [class]="BUTTON_PRESET_CLASS.ghost"
          ></a>
        } @else {
          <button
            pButton
            type="button"
            [icon]="cancelIcon() || ''"
            [label]="(cancelLabelKey() || 'common.cancel') | translate"
            [class]="BUTTON_PRESET_CLASS.ghost"
            (click)="cancel.emit()"
          ></button>
        }
      }
      <ng-content />
      @if (showSave()) {
        <button
          pButton
          type="button"
          [icon]="saveIcon()"
          [label]="(saveLabelKey() || 'common.save') | translate"
          [loading]="saving()"
          [disabled]="saveDisabled() || saving()"
          (click)="save.emit()"
        ></button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      :host.flush .form-actions {
        margin-top: 0;
      }

      .form-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1.25rem;
      }
    `,
  ],
})
export class FormActionsComponent {
  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;

  readonly saving = input(false);
  readonly saveDisabled = input(false);
  readonly showSave = input(true);
  readonly showCancel = input(true);
  readonly saveLabelKey = input<string | null>(null);
  readonly saveIcon = input('pi pi-save');
  readonly cancelLabelKey = input<string | null>(null);
  readonly cancelIcon = input('');
  readonly cancelLink = input<string | (string | number | null)[] | null>(null);
  readonly flush = input(false);

  readonly save = output<void>();
  readonly cancel = output<void>();

  get cancelCommands(): any[] | string {
    return this.cancelLink() ?? [];
  }
}
