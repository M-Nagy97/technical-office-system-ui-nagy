import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { RippleModule } from 'primeng/ripple';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';

import { map } from 'rxjs/operators';
import { ShiftsService, ShiftDto } from '../../../core/api/generated';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    RippleModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  templateUrl: './shift-list.component.html',
  styleUrl: './shift-list.component.scss',
})
export class ShiftListComponent implements OnInit {
  private readonly shiftsApi = inject(ShiftsService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly shifts = signal<ShiftDto[]>([]);
  readonly searchText = signal('');

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts(): void {
    this.loading.set(true);
    this.shiftsApi.shiftsGetAll().pipe(
      map((res: any) => res.data ?? [])
    ).subscribe({
      next: (list: ShiftDto[]) => {
        this.shifts.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  readonly filteredShifts = computed(() => {
    const list = this.shifts();
    const q = this.searchText().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.shiftCode?.toLowerCase().includes(q)) ||
        (s.shiftName?.toLowerCase().includes(q))
    );
  });

  readonly columns: SharedTableColumn<ShiftDto>[] = [
    {
      id: 'shiftCode',
      header: 'الكود',
      field: 'shiftCode',
    },
    {
      id: 'shiftName',
      header: 'الاسم',
      field: 'shiftName',
    },
    {
      id: 'shiftStart',
      header: 'وقت البداية',
      valueGetter: (row) => this.formatTime(row.shiftStart),
    },
    {
      id: 'shiftEnd',
      header: 'وقت النهاية',
      valueGetter: (row) => this.formatTime(row.shiftEnd),
    },
    {
      id: 'fingerIn',
      header: 'بصمة الدخول',
      valueGetter: (row) => `${this.formatTime(row.fingerInFrom)} - ${this.formatTime(row.fingerInTo)}`,
    },
    {
      id: 'fingerOut',
      header: 'بصمة الخروج',
      valueGetter: (row) => `${this.formatTime(row.fingerOutFrom)} - ${this.formatTime(row.fingerOutTo)}`,
    },
    {
      id: 'crossesMidnight',
      header: 'عبر منتصف الليل',
      valueGetter: (row) => row.crossesMidnight,
      cellClass: (row) => (row.crossesMidnight ? 'text-blue-500' : 'text-500'),
    },
    {
      id: 'isActive',
      header: 'الحالة',
      valueGetter: (row) => row.isActive,
    },
  ];

  readonly actions: SharedTableAction<ShiftDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded',
      onClick: (row) => {
        if (!row.id) return;
        this.router.navigate(['/attendance/shifts', row.id, 'edit']);
      },
    },
  ];

  formatTime(value: string | undefined): string {
    if (!value) return '—';
    return value;
  }
}
