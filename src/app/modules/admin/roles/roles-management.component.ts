import { Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../core/auth/permission.service';
import {
  IdentityManagementApiService,
  IdentityPermission,
  IdentityRole,
  RolePayload,
} from '../../../core/api/identity-management-api.service';
import { RoleDialogComponent } from './components/role-dialog/role-dialog.component';
import { RolePermissionsDialogComponent } from './components/role-permissions-dialog/role-permissions-dialog.component';
import {
  BUTTON_PRESET_CLASS,
  ConfirmService,
  EntityCellComponent,
  NotifyService,
  PageHeaderComponent,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
  tableCustomAction,
  tableDeleteAction,
  tableEditAction,
} from '../../../shared';

@Component({
  selector: 'app-roles-management',
  standalone: true,
  imports: [
    TranslatePipe,
    ButtonModule,
    CardModule,
    RoleDialogComponent,
    RolePermissionsDialogComponent,
    HasPermissionDirective,
    PageHeaderComponent,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    EntityCellComponent,
  ],
  templateUrl: './roles-management.component.html',
  styleUrl: './roles-management.component.scss',
})
export class RolesManagementComponent implements OnInit {
  private readonly api = inject(IdentityManagementApiService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);
  private readonly permission = inject(PermissionService);

  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly permissionsLoading = signal(false);
  readonly permissionsSaving = signal(false);
  readonly roles = signal<IdentityRole[]>([]);
  readonly roleDialogVisible = signal(false);
  readonly permissionsDialogVisible = signal(false);
  readonly selectedRole = signal<IdentityRole | null>(null);
  readonly permissions = signal<IdentityPermission[]>([]);
  readonly selectedPermissionIds = signal<number[]>([]);

  readonly columns: SharedTableColumn<IdentityRole>[] = [
    { id: 'name', header: 'roles.fields.name' },
    { id: 'description', header: 'roles.fields.description', valueGetter: (row) => row.description || '-' },
  ];

  readonly actions: SharedTableAction<IdentityRole>[] = [
    tableCustomAction({
      id: 'permissions',
      icon: 'pi pi-key',
      tooltip: 'roles.actions.permissions',
      visible: this.permission.writeVisible('admin'),
      onClick: (row) => this.openPermissions(row),
    }),
    tableEditAction((row) => this.openEdit(row), { visible: this.permission.writeVisible('admin') }),
    tableDeleteAction((row) => this.confirmDelete(row), { visible: this.permission.writeVisible('admin') }),
  ];

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading.set(true);

    this.api.getRoles()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (roles) => {
          this.roles.set([...roles].sort((left, right) => (left.name ?? '').localeCompare(right.name ?? '')));
        },
        error: (error) => this.notify.error(error, 'roles.messages.load_error'),
      });
  }

  openCreate(): void {
    this.selectedRole.set(null);
    this.roleDialogVisible.set(true);
  }

  openEdit(role: IdentityRole): void {
    this.selectedRole.set(role);
    this.roleDialogVisible.set(true);
  }

  saveRole(payload: RolePayload): void {
    const role = this.selectedRole();
    const request = role?.id
      ? this.api.updateRole(role.id, payload)
      : this.api.createRole(payload);

    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.roleDialogVisible.set(false);
        this.notify.success(role?.id ? 'roles.messages.update_success' : 'roles.messages.create_success');
        this.loadRoles();
      },
      error: (error) => this.notify.error(error, role?.id ? 'roles.messages.update_error' : 'roles.messages.create_error'),
    });
  }

  confirmDelete(role: IdentityRole): void {
    if (!role.id) {
      return;
    }

    this.confirm.confirm({
      headerKey: 'roles.delete.title',
      messageKey: 'roles.delete.message',
      messageParams: { name: role.name || '-' },
      accept: () => this.deleteRole(role.id!),
    });
  }

  openPermissions(role: IdentityRole): void {
    if (!role.id) {
      return;
    }

    this.selectedRole.set(role);
    this.permissionsDialogVisible.set(true);
    this.permissionsLoading.set(true);

    forkJoin({
      all: this.api.getPermissions(),
      assigned: this.api.getRolePermissions(role.id),
    })
      .pipe(finalize(() => this.permissionsLoading.set(false)))
      .subscribe({
        next: ({ all, assigned }) => {
          this.permissions.set([...all].sort((left, right) => (left.code ?? '').localeCompare(right.code ?? '')));
          this.selectedPermissionIds.set(
            assigned
              .map((permission) => permission.id)
              .filter((id): id is number => id != null),
          );
        },
        error: (error) => this.notify.error(error, 'roles.permissions.load_error'),
      });
  }

  savePermissions(permissionIds: number[]): void {
    const role = this.selectedRole();
    if (!role?.id) {
      return;
    }

    this.permissionsSaving.set(true);
    this.api.updateRolePermissions(role.id, permissionIds)
      .pipe(finalize(() => this.permissionsSaving.set(false)))
      .subscribe({
        next: () => {
          this.permissionsDialogVisible.set(false);
          this.notify.success('roles.permissions.save_success');
        },
        error: (error) => this.notify.error(error, 'roles.permissions.save_error'),
      });
  }

  private deleteRole(roleId: string): void {
    this.api.deleteRole(roleId).subscribe({
      next: () => {
        this.notify.success('roles.messages.delete_success');
        this.loadRoles();
      },
      error: (error) => this.notify.error(error, 'roles.messages.delete_error'),
    });
  }
}
