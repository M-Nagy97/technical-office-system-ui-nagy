import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../core/auth/permission.service';
import {
  IdentityManagementApiService,
  IdentityModule,
  IdentityPage,
  IdentityPermission,
  PagePayload,
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
  value: number | null;
}

@Component({
  selector: 'app-pages-management',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    HasPermissionDirective,
    PageHeaderComponent,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    CrudDialogComponent,
    FormFieldComponent,
  ],
  templateUrl: './pages-management.component.html',
  styleUrl: './pages-management.component.scss',
})
export class PagesManagementComponent implements OnInit {
  private readonly api = inject(IdentityManagementApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);
  private readonly permission = inject(PermissionService);

  readonly BUTTON_PRESET_CLASS = BUTTON_PRESET_CLASS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly dialogVisible = signal(false);
  readonly selectedPage = signal<IdentityPage | null>(null);
  readonly pages = signal<IdentityPage[]>([]);
  readonly modules = signal<IdentityModule[]>([]);
  readonly permissions = signal<IdentityPermission[]>([]);

  readonly form = this.formBuilder.group({
    code: ['', [Validators.required, Validators.maxLength(128)]],
    name: ['', [Validators.required, Validators.maxLength(256)]],
    urlPath: ['', [Validators.maxLength(600)]],
    parentId: [null as number | null],
    moduleId: [null as number | null],
    permissionId: [null as number | null],
  });

  readonly columns: SharedTableColumn<IdentityPage>[] = [
    { id: 'code', header: 'pages.fields.code' },
    { id: 'name', header: 'pages.fields.name', valueGetter: (row) => row.name || '-' },
    { id: 'urlPath', header: 'pages.fields.urlPath', valueGetter: (row) => row.urlPath || '-' },
    { id: 'parent', header: 'pages.fields.parent', valueGetter: (row) => this.parentLabel(row.parentId) },
    { id: 'module', header: 'pages.fields.module', valueGetter: (row) => this.moduleLabel(row.moduleId) },
    { id: 'permission', header: 'pages.fields.permission', valueGetter: (row) => this.permissionLabel(row.permissionId) },
  ];

  readonly actions: SharedTableAction<IdentityPage>[] = [
    tableEditAction((row) => this.openEdit(row), { visible: this.permission.writeVisible('admin') }),
    tableDeleteAction((row) => this.confirmDelete(row), { visible: this.permission.writeVisible('admin') }),
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    forkJoin({
      pages: this.api.getPages(),
      modules: this.api.getModules(),
      permissions: this.api.getPermissions(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ pages, modules, permissions }) => {
          this.pages.set([...pages].sort((left, right) => (left.code ?? '').localeCompare(right.code ?? '')));
          this.modules.set([...modules].sort((left, right) => (left.code ?? '').localeCompare(right.code ?? '')));
          this.permissions.set([...permissions].sort((left, right) => (left.code ?? '').localeCompare(right.code ?? '')));
        },
        error: (error) => this.notify.error(error, 'pages.messages.load_error'),
      });
  }

  openCreate(): void {
    this.selectedPage.set(null);
    this.form.reset({
      code: '',
      name: '',
      urlPath: '',
      parentId: null,
      moduleId: null,
      permissionId: null,
    });
    this.dialogVisible.set(true);
  }

  openEdit(page: IdentityPage): void {
    this.selectedPage.set(page);
    this.form.reset({
      code: page.code ?? '',
      name: page.name ?? '',
      urlPath: page.urlPath ?? '',
      parentId: page.parentId ?? null,
      moduleId: page.moduleId ?? null,
      permissionId: page.permissionId ?? null,
    });
    this.dialogVisible.set(true);
  }

  savePage(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const page = this.selectedPage();
    const payload = this.buildPayload();
    const request = page?.id != null
      ? this.api.updatePage(page.id, payload)
      : this.api.createPage(payload);

    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.dialogVisible.set(false);
        this.notify.success(page?.id != null ? 'pages.messages.update_success' : 'pages.messages.create_success');
        this.loadData();
      },
      error: (error) => this.notify.error(error, page?.id != null ? 'pages.messages.update_error' : 'pages.messages.create_error'),
    });
  }

  confirmDelete(page: IdentityPage): void {
    if (page.id == null) {
      return;
    }

    this.confirm.confirm({
      headerKey: 'pages.delete.title',
      messageKey: 'pages.delete.message',
      messageParams: { name: page.name || page.code || '-' },
      accept: () => this.deletePage(page.id!),
    });
  }

  parentPageOptions(): SelectOption[] {
    const selectedId = this.selectedPage()?.id ?? null;
    return this.pages()
      .filter((page) => page.id != null && page.id !== selectedId)
      .map((page) => ({
        label: `${page.name || page.code || page.id} (${page.code || page.id})`,
        value: page.id!,
      }));
  }

  moduleOptions(): SelectOption[] {
    return this.modules()
      .filter((module) => module.id != null)
      .map((module) => ({
        label: `${module.name || module.code || module.id} (${module.code || module.id})`,
        value: module.id!,
      }));
  }

  permissionOptions(): SelectOption[] {
    return this.permissions()
      .filter((permission) => permission.id != null)
      .map((permission) => ({
        label: `${permission.name || permission.code || permission.id} (${permission.code || permission.id})`,
        value: permission.id!,
      }));
  }

  moduleLabel(moduleId: number | null | undefined): string {
    if (moduleId == null) {
      return '-';
    }
    const module = this.modules().find((item) => item.id === moduleId);
    return module?.name || module?.code || `${moduleId}`;
  }

  permissionLabel(permissionId: number | null | undefined): string {
    if (permissionId == null) {
      return '-';
    }
    const permission = this.permissions().find((item) => item.id === permissionId);
    return permission?.name || permission?.code || `${permissionId}`;
  }

  parentLabel(parentId: number | null | undefined): string {
    if (parentId == null) {
      return '-';
    }
    const page = this.pages().find((item) => item.id === parentId);
    return page?.name || page?.code || `${parentId}`;
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  private deletePage(pageId: number): void {
    this.api.deletePage(pageId).subscribe({
      next: () => {
        this.notify.success('pages.messages.delete_success');
        this.loadData();
      },
      error: (error) => this.notify.error(error, 'pages.messages.delete_error'),
    });
  }

  private buildPayload(): PagePayload {
    const value = this.form.getRawValue();
    return {
      code: (value.code ?? '').trim(),
      name: (value.name ?? '').trim(),
      urlPath: this.toNullable(value.urlPath ?? ''),
      parentId: value.parentId ?? null,
      moduleId: value.moduleId ?? null,
      permissionId: value.permissionId ?? null,
    };
  }

  private toNullable(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
