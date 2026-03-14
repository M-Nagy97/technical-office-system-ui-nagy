import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { ConfirmationService, MessageService } from 'primeng/api';
import { OrganizationUnitsService, OrganizationUnitDto } from '../../../core/api/generated';


@Component({
  selector: 'app-organization-unit-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    ConfirmDialogModule,
    ConfirmPopupModule,
    ToastModule,
    TooltipModule,
    RippleModule,
  ],
  templateUrl: './organization-unit-list.component.html',
  styleUrl: './organization-unit-list.component.scss',
})
export class OrganizationUnitListComponent implements OnInit {
  private readonly organizationUnitsService = inject(OrganizationUnitsService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

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
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء تحميل البيانات',
        });
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
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء الحذف',
        });
      },
    });
  }
}
