import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../core/auth/permission.service';
import {
  IdentityManagementApiService,
  IdentityModule,
  IdentityPermission,
  PermissionPayload,
} from '../../../core/api/identity-management-api.service';
import {
  BUTTON_PRESET_CLASS,
  ConfirmService,
  CrudDialogComponent,
  FormFieldComponent,
  NotifyService,
  PageHeaderComponent,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
  tableDeleteAction,
  tableEditAction,
} from '../../../shared';

interface SelectOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-permissions-management',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    HasPermissionDirective,
    PageHeaderComponent,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    CrudDialogComponent,
    FormFieldComponent,
  ],
  templateUrl: './permissions-management.component.html',
  styleUrl: './permissions-management.component.scss',
})
export class PermissionsManagementComponent implements OnInit {
  private readonly api = inject(IdentityManagementApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);
  private readonly permission = inject(PermissionService);

  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;
  readonly loading = signal(true);
  readonly modulesLoading = signal(false);
  readonly modulesLoadFailed = signal(false);
  readonly saving = signal(false);
  readonly dialogVisible = signal(false);
  readonly selectedPermission = signal<IdentityPermission | null>(null);
  readonly permissions = signal<IdentityPermission[]>([]);
  readonly modules = signal<IdentityModule[]>([]);

  readonly form = this.formBuilder.group({
    code: ['', [Validators.required, Validators.maxLength(128)]],
    name: ['', [Validators.required, Validators.maxLength(256)]],
    description: ['', [Validators.maxLength(500)]],
    moduleId: [null as number | null, [Validators.required]],
  });

  readonly columns: SharedTableColumn<IdentityPermission>[] = [
    { id: 'code', header: 'permissions.fields.code' },
    { id: 'name', header: 'permissions.fields.name', valueGetter: (row) => row.name || '-' },
    { id: 'description', header: 'permissions.fields.description', valueGetter: (row) => row.description || '-' },
    { id: 'module', header: 'permissions.fields.module', valueGetter: (row) => this.moduleLabel(row.moduleId) },
  ];

  readonly actions: SharedTableAction<IdentityPermission>[] = [
    tableEditAction((row) => this.openEdit(row), { visible: this.permission.writeVisible('admin') }),
    tableDeleteAction((row) => this.confirmDelete(row), { visible: this.permission.writeVisible('admin') }),
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadPermissions();
    this.loadModules();
  }

  loadModules(): void {
    this.modulesLoading.set(true);
    this.modulesLoadFailed.set(false);

    this.api.getModules()
      .pipe(finalize(() => this.modulesLoading.set(false)))
      .subscribe({
        next: (modules) => {
          this.modules.set([...modules].sort((left, right) => (left.code ?? '').localeCompare(right.code ?? '')));
        },
        error: (error) => {
          this.modulesLoadFailed.set(true);
          this.modules.set([]);
          this.notify.error(error, 'permissions.messages.modules_load_error');
        },
      });
  }

  private loadPermissions(): void {
    this.loading.set(true);

    this.api.getPermissions()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (permissions) => {
          this.permissions.set([...permissions].sort((left, right) => (left.code ?? '').localeCompare(right.code ?? '')));
        },
        error: (error) => this.notify.error(error, 'permissions.messages.load_error'),
      });
  }

  openCreate(): void {
    if (!this.modules().length && !this.modulesLoading()) {
      this.loadModules();
    }

    this.selectedPermission.set(null);
    this.form.reset({
      code: '',
      name: '',
      description: '',
      moduleId: null,
    });
    this.dialogVisible.set(true);
  }

  openEdit(permission: IdentityPermission): void {
    if (!this.modules().length && !this.modulesLoading()) {
      this.loadModules();
    }

    this.selectedPermission.set(permission);
    this.form.reset({
      code: permission.code ?? '',
      name: permission.name ?? '',
      description: permission.description ?? '',
      moduleId: permission.moduleId ?? null,
    });
    this.dialogVisible.set(true);
  }

  savePermission(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const permission = this.selectedPermission();
    const payload = this.buildPayload();
    const request = permission?.id != null
      ? this.api.updatePermission(permission.id, payload)
      : this.api.createPermission(payload);

    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.dialogVisible.set(false);
        this.notify.success(
          permission?.id != null
            ? 'permissions.messages.update_success'
            : 'permissions.messages.create_success',
        );
        this.loadData();
      },
      error: (error) => this.notify.error(
        error,
        permission?.id != null
          ? 'permissions.messages.update_error'
          : 'permissions.messages.create_error',
      ),
    });
  }

  confirmDelete(permission: IdentityPermission): void {
    if (permission.id == null) {
      return;
    }

    this.confirm.confirm({
      headerKey: 'permissions.delete.title',
      messageKey: 'permissions.delete.message',
      messageParams: { name: permission.name || permission.code || '-' },
      accept: () => this.deletePermission(permission.id!),
    });
  }

  moduleOptions(): SelectOption[] {
    return this.modules()
      .filter((module) => module.id != null)
      .map((module) => ({
        label: this.moduleOptionLabel(module),
        value: module.id!,
      }));
  }

  moduleLabel(moduleId: number | null | undefined): string {
    if (moduleId == null) {
      return '-';
    }
    const module = this.modules().find((item) => item.id === moduleId);
    return module?.name || module?.code || `${moduleId}`;
  }

  private moduleOptionLabel(module: IdentityModule): string {
    const name = module.name?.trim();
    const code = module.code?.trim();
    if (name && code) {
      return `${name} (${code})`;
    }
    return name || code || `${module.id}`;
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  private deletePermission(permissionId: number): void {
    this.api.deletePermission(permissionId).subscribe({
      next: () => {
        this.notify.success('permissions.messages.delete_success');
        this.loadData();
      },
      error: (error) => this.notify.error(error, 'permissions.messages.delete_error'),
    });
  }

  private buildPayload(): PermissionPayload {
    const value = this.form.getRawValue();
    return {
      code: (value.code ?? '').trim(),
      name: (value.name ?? '').trim(),
      description: this.toNullable(value.description ?? ''),
      moduleId: value.moduleId!,
    };
  }

  private toNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
