import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OrganizationUnitsService, OrganizationUnitDto } from '../../../core/api/generated';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';


@Component({
  selector: 'app-organization-unit-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ConfirmPopupModule,
    TooltipModule,
    RippleModule,
    SharedTableComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './organization-unit-list.component.html',
  styleUrl: './organization-unit-list.component.scss',
})
export class OrganizationUnitListComponent implements OnInit {
  private readonly organizationUnitsService = inject(OrganizationUnitsService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

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
    { id: 'code', header: 'الرمز', field: 'code', sortableField: 'code' },
    { id: 'name', header: 'الاسم', field: 'name', sortableField: 'name' },
    {
      id: 'parentName',
      header: 'الوحدة الأم',
      valueGetter: (row) => this.getParentName(row.parentId),
    },
  ];

  readonly actions: SharedTableAction<OrganizationUnitDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => {
        if (!row.id) return;
        this.router.navigate(['/organization-units', row.id, 'edit']);
      },
    },
    {
      id: 'delete',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, event) => this.confirmDelete(event, row),
    },
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
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'تحذير',
            detail: res.message ?? 'فشل في تحميل الوحدات التنظيمية',
          });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  confirmDelete(event: Event, unit: OrganizationUnitDto): void {
    if (!unit.id) return;
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `هل أنت متأكد من حذف الوحدة "${unit.name ?? unit.code}"؟`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(unit.id!),
    });
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
          this.messageService.add({
            severity: 'success',
            summary: 'تم',
            detail: 'تم حذف الوحدة التنظيمية',
          });
          this.load();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: res.message ?? 'فشل الحذف',
          });
        }
      },
      // Global error interceptor already shows the API message (incl. business rules).
      error: () => undefined,
    });
  }
}
