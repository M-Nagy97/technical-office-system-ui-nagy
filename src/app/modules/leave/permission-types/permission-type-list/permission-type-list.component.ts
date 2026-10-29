import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ConfirmService,
  FilterBarComponent,
  NotifyService,
  SharedTableAction,
  SharedTableColumn,
  SharedTableComponent,
  tableDeleteAction,
  tableEditAction,
} from '../../../../shared';
import { PermissionService } from '../../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { LanguageService } from '../../../../core';
import { PermissionTypeService, PermissionTypeDto } from '../../../../core/services/permission-type.service';

@Component({
  selector: 'app-permission-type-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    SharedTableComponent,
    TranslateModule,
    HasPermissionDirective,
    FilterBarComponent,
  ],
  templateUrl: './permission-type-list.component.html',
  styleUrl: './permission-type-list.component.scss',
})
export class PermissionTypeListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotifyService);
  private readonly permissionTypeService = inject(PermissionTypeService);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  private readonly permission = inject(PermissionService);

  readonly loading = signal(false);
  readonly searchText = signal('');
  readonly permissionTypes = signal<PermissionTypeDto[]>([]);

  readonly filteredPermissionTypes = computed(() => {
    const list = this.permissionTypes();
    const query = this.searchText().trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (item) =>
        (item.name?.toLowerCase().includes(query) ?? false) ||
        (item.arabicName?.toLowerCase().includes(query) ?? false)
    );
  });

  readonly columns: SharedTableColumn<PermissionTypeDto>[] = [
    { id: 'arabicName', header: 'leave.permission_types.col_arabic_name', field: 'arabicName', sortableField: 'arabicName', width: '35%' },
    { id: 'name', header: 'leave.permission_types.col_name', field: 'name', sortableField: 'name', width: '35%' },
    {
      id: 'isActive',
      header: 'leave.permission_types.col_status',
      width: '20%',
      valueGetter: (row) =>
        row.isActive
          ? this.translate.instant('leave.permission_types.status_active')
          : this.translate.instant('leave.permission_types.status_inactive'),
    },
  ];

  readonly actions: SharedTableAction<PermissionTypeDto>[] = [
    tableEditAction((row) => {
      this.router.navigate(['/leave/permission-types/add'], { queryParams: { id: row.id } });
    }, { visible: this.permission.writeVisible('leave') }),
    tableDeleteAction((row) => {
      const name =
        this.languageService.currentLang() === 'ar'
          ? row.arabicName || row.name
          : row.name || row.arabicName;
      this.confirm.confirmDelete(name, () => this.deletePermissionType(row.id));
    }, { visible: this.permission.writeVisible('leave') }),
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.permissionTypeService.getAll().subscribe({
      next: (data) => {
        this.permissionTypes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  deletePermissionType(id: string): void {
    this.permissionTypeService.delete(id).subscribe({
      next: () => {
        this.notify.success('leave.permission_types.delete_success');
        this.loadData();
      },
    });
  }
}
