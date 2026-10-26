import { Component, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { FormActionsComponent } from '../form-actions/form-actions.component';

@Component({
  selector: 'app-crud-dialog',
  standalone: true,
  imports: [DialogModule, FormActionsComponent],
  template: `
    <p-dialog
      [visible]="visible()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: width(), maxWidth: '92vw' }"
      [header]="header()"
      (visibleChange)="visibleChange.emit($event)"
      (onHide)="cancel.emit()"
    >
      <ng-content />
      @if (showFooter()) {
        <ng-template pTemplate="footer">
          <app-form-actions
            [flush]="true"
            [saving]="saving()"
            [saveDisabled]="saveDisabled()"
            [saveLabelKey]="saveLabelKey()"
            (save)="save.emit()"
            (cancel)="onCancel()"
          />
        </ng-template>
      }
    </p-dialog>
  `,
})
export class CrudDialogComponent {
  readonly visible = input(false);
  readonly header = input('');
  readonly width = input('32rem');
  readonly saving = input(false);
  readonly saveDisabled = input(false);
  readonly saveLabelKey = input<string | null>(null);
  readonly showFooter = input(true);

  readonly visibleChange = output<boolean>();
  readonly save = output<void>();
  readonly cancel = output<void>();

  onCancel(): void {
    this.visibleChange.emit(false);
    this.cancel.emit();
  }
}
