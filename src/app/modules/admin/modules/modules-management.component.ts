import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../core/auth/permission.service';
import {
  IdentityManagementApiService,
  IdentityModule,
  ModulePayload,
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

@Component({
  selector: 'app-modules-management',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    HasPermissionDirective,
    PageHeaderComponent,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    CrudDialogComponent,
    FormFieldComponent,
  ],
  templateUrl: './modules-management.component.html',
  styleUrl: './modules-management.component.scss',
})
export class ModulesManagementComponent implements OnInit {
  private readonly api = inject(IdentityManagementApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);
  private readonly permission = inject(PermissionService);

  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly dialogVisible = signal(false);
  readonly selectedModule = signal<IdentityModule | null>(null);
  readonly modules = signal<IdentityModule[]>([]);

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(128)]],
    name: ['', [Validators.required, Validators.maxLength(256)]],
  });

  readonly columns: SharedTableColumn<IdentityModule>[] = [
    { id: 'code', header: 'modules.fields.code' },
    { id: 'name', header: 'modules.fields.name', valueGetter: (row) => row.name || '-' },
  ];

  readonly actions: SharedTableAction<IdentityModule>[] = [
    tableEditAction((row) => this.openEdit(row), { visible: this.permission.writeVisible('admin') }),
    tableDeleteAction((row) => this.confirmDelete(row), { visible: this.permission.writeVisible('admin') }),
  ];

  ngOnInit(): void {
    this.loadModules();
  }

  loadModules(): void {
    this.loading.set(true);

    this.api.getModules()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (modules) => {
          this.modules.set([...modules].sort((left, right) => (left.code ?? '').localeCompare(right.code ?? '')));
        },
        error: (error) => this.notify.error(error, 'modules.messages.load_error'),
      });
  }

  openCreate(): void {
    this.selectedModule.set(null);
    this.form.reset({ code: '', name: '' });
    this.dialogVisible.set(true);
  }

  openEdit(module: IdentityModule): void {
    this.selectedModule.set(module);
    this.form.reset({
      code: module.code ?? '',
      name: module.name ?? '',
    });
    this.dialogVisible.set(true);
  }

  saveModule(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const module = this.selectedModule();
    const payload = this.buildPayload();
    const request = module?.id != null
      ? this.api.updateModule(module.id, payload)
      : this.api.createModule(payload);

    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.dialogVisible.set(false);
        this.notify.success(module?.id != null ? 'modules.messages.update_success' : 'modules.messages.create_success');
        this.loadModules();
      },
      error: (error) => this.notify.error(error, module?.id != null ? 'modules.messages.update_error' : 'modules.messages.create_error'),
    });
  }

  confirmDelete(module: IdentityModule): void {
    if (module.id == null) {
      return;
    }

    this.confirm.confirm({
      headerKey: 'modules.delete.title',
      messageKey: 'modules.delete.message',
      messageParams: { name: module.name || module.code || '-' },
      accept: () => this.deleteModule(module.id!),
    });
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  private deleteModule(moduleId: number): void {
    this.api.deleteModule(moduleId).subscribe({
      next: () => {
        this.notify.success('modules.messages.delete_success');
        this.loadModules();
      },
      error: (error) => this.notify.error(error, 'modules.messages.delete_error'),
    });
  }

  private buildPayload(): ModulePayload {
    const value = this.form.getRawValue();
    return {
      code: value.code.trim(),
      name: value.name.trim(),
    };
  }
}
