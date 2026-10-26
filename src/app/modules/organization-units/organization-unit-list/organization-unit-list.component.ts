import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PermissionService } from '../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { OrganizationUnitsService, OrganizationUnitDto } from '../../../core/api/generated';
import {
  ConfirmService,
  FilterBarComponent,
  NotifyService,
  SharedTableAction,
  SharedTableColumn,
  SharedTableComponent,
  tableDeleteAction,
  tableEditAction,
} from '../../../shared';


@Component({
  selector: 'app-organization-unit-list',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    HasPermissionDirective,
    SharedTableComponent,
    FilterBarComponent,
  ],
  templateUrl: './organization-unit-list.component.html',
  styleUrl: './organization-unit-list.component.scss',
})
export class OrganizationUnitListComponent implements OnInit {
  private readonly organizationUnitsService = inject(OrganizationUnitsService);
  private readonly confirm = inject(ConfirmService);
  private readonly notify = inject(NotifyService);
  private readonly router = inject(Router);
  private readonly permission = inject(PermissionService);

  readonly loading = signal(false);
  readonly units = signal<OrganizationUnitDto[]>([]);
  readonly searchText = signal('');

  readonly filteredUnits = computed(() => {
    const list = this.units();
    const search = this.searchText().trim().toLowerCase();
    if (!search) return list;
    return list.filter(
      (u) =>
        (u.code?.toLowerCase().includes(search) ?? false) ||
        (u.name?.toLowerCase().includes(search) ?? false)
    );
  });

  readonly columns: SharedTableColumn<OrganizationUnitDto>[] = [
    { id: 'code', header: 'common.code', field: 'code', sortableField: 'code' },
    { id: 'name', header: 'common.name', field: 'name', sortableField: 'name' },
    {
      id: 'parentName',
      header: 'organization_units.parent',
      valueGetter: (row) => this.getParentName(row.parentId),
    },
  ];

  readonly actions: SharedTableAction<OrganizationUnitDto>[] = [
    tableEditAction((row) => {
      if (!row.id) return;
      this.router.navigate(['/organization-units', row.id, 'edit']);
    }, { visible: this.permission.writeVisible('employees') }),
    tableDeleteAction((row) => this.confirmDelete(row), { visible: this.permission.writeVisible('employees') }),
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.organizationUnitsService.organizationUnitsGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.units.set(res.data);
        } else if (res.message) {
          this.notify.warnText(res.message);
        } else {
          this.notify.warn('common.load_error');
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  confirmDelete(unit: OrganizationUnitDto): void {
    if (!unit.id) return;
    this.confirm.confirmDelete(unit.name ?? unit.code, () => this.delete(unit.id!));
  }

  getParentName(parentId: string | null | undefined): string {
    if (!parentId) return '-';
    const parent = this.units().find((u) => u.id === parentId);
    return parent?.name ?? parent?.code ?? parentId;
  }

  delete(id: string): void {
    this.organizationUnitsService.organizationUnitsDelete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.notify.success('common.delete_success');
          this.load();
        } else if (res.message) {
          this.notify.errorText(res.message);
        } else {
          this.notify.error(null, 'common.delete_error');
        }
      },
      // Global error interceptor already shows the API message (incl. business rules).
      error: () => undefined,
    });
  }
}
