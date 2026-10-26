import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { IdentityPermission, IdentityRole } from '../../../../../core/api/identity-management-api.service';

@Component({
  selector: 'app-role-permissions-dialog',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './role-permissions-dialog.component.html',
  styleUrl: './role-permissions-dialog.component.scss',
})
export class RolePermissionsDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() role: IdentityRole | null = null;
  @Input() permissions: IdentityPermission[] = [];
  @Input() selectedPermissionIds: number[] = [];
  @Input() loading = false;
  @Input() saving = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<number[]>();

  readonly selectedIds = signal<Set<number>>(new Set());

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedPermissionIds'] || changes['visible']) {
      this.selectedIds.set(new Set(this.selectedPermissionIds));
    }
  }

  togglePermission(permission: IdentityPermission, checked: boolean): void {
    if (permission.id == null) {
      return;
    }

    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(permission.id!);
      } else {
        next.delete(permission.id!);
      }
      return next;
    });
  }

  isSelected(permission: IdentityPermission): boolean {
    return permission.id != null && this.selectedIds().has(permission.id);
  }

  submit(): void {
    this.save.emit([...this.selectedIds()]);
  }

  close(): void {
    this.visibleChange.emit(false);
  }
}
