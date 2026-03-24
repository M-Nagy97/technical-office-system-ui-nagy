import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, finalize, map, takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslatePipe } from '@ngx-translate/core';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import {
  EmployeeAttendanceDirectoryRowDto,
  EmployeeAttendanceService,
  EmployeeScheduleAttendanceDetailDto,
  PlansService,
  ShiftsService,
} from '../../../core/api/generated';

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    DialogModule,
    CalendarModule,
    TooltipModule,
    ToastModule,
    TranslatePipe,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  providers: [MessageService],
  templateUrl: './employee-attendance.component.html',
  styleUrl: './employee-attendance.component.scss',
})
export class EmployeeAttendanceComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly nameTrigger$ = new Subject<void>();

  private readonly directoryApi = inject(EmployeeAttendanceService);
  private readonly plansApi = inject(PlansService);
  private readonly shiftsApi = inject(ShiftsService);
  private readonly messageService = inject(MessageService);

  readonly rows = signal<EmployeeAttendanceDirectoryRowDto[]>([]);
  readonly loading = signal(false);

  readonly planOptions = signal<{ label: string; value: string }[]>([]);
  readonly shiftOptions = signal<{ label: string; value: string }[]>([]);

  nameFilter = '';
  selectedPlanId: string | null = null;
  selectedShiftId: string | null = null;

  detailVisible = false;
  detailLoading = false;
  readonly detailRows = signal<EmployeeScheduleAttendanceDetailDto[]>([]);
  detailEmployee: EmployeeAttendanceDirectoryRowDto | null = null;
  detailFrom = new Date();
  detailTo = new Date();

  ngOnInit(): void {
    forkJoin({
      plans: this.plansApi.plansGetAll().pipe(map((r) => r.data ?? [])),
      shifts: this.shiftsApi.shiftsGetAll(undefined).pipe(map((r) => r.data ?? [])),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ plans, shifts }) => {
          this.planOptions.set(
            plans.map((p) => ({ label: p.name?.trim() || p.id || '', value: p.id! }))
          );
          this.shiftOptions.set(
            shifts
              .filter((s) => s.isActive !== false)
              .map((s) => ({
                label: [s.shiftName, s.shiftCode].filter(Boolean).join(' — ') || s.id || '',
                value: s.id!,
              }))
          );
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not load plans or shifts.',
          }),
      });

    this.nameTrigger$
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.reloadDirectory());

    this.reloadDirectory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onNameInput(): void {
    this.nameTrigger$.next();
  }

  onPlanOrShiftChange(): void {
    this.reloadDirectory();
  }

  reloadDirectory(): void {
    this.loading.set(true);
    const name = this.nameFilter?.trim() || undefined;
    const planId = this.selectedPlanId || undefined;
    const shiftId = this.selectedShiftId || undefined;
    this.directoryApi
      .employeeAttendanceGetDirectory(name, planId, shiftId)
      .pipe(
        map((r) => r.data ?? []),
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (list) => this.rows.set(list),
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not load employee directory.',
          }),
      });
  }

  openDetail(row: EmployeeAttendanceDirectoryRowDto): void {
    this.detailEmployee = row;
    const now = new Date();
    this.detailFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    this.detailTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.detailVisible = true;
    this.loadDetail();
  }

  closeDetail(): void {
    this.detailVisible = false;
    this.detailEmployee = null;
    this.detailRows.set([]);
  }

  onDetailRangeChange(): void {
    if (this.detailFrom > this.detailTo) {
      const t = this.detailFrom;
      this.detailFrom = this.detailTo;
      this.detailTo = t;
    }
    this.loadDetail();
  }

  loadDetail(): void {
    const emp = this.detailEmployee;
    if (!emp?.employeeId) return;
    this.detailLoading = true;
    const from = toYmdLocal(this.detailFrom);
    const to = toYmdLocal(this.detailTo);
    this.directoryApi
      .employeeAttendanceGetScheduleAttendance(emp.employeeId, from, to)
      .pipe(
        map((r) => r.data ?? []),
        finalize(() => (this.detailLoading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (list) => this.detailRows.set(list),
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Could not load schedule / attendance detail.',
          }),
      });
  }

  dayTypeKey(v?: number): string {
    switch (v) {
      case 1:
        return 'workday';
      case 2:
        return 'weekend';
      case 3:
        return 'public_holiday';
      case 4:
        return 'compensatory';
      default:
        return 'unknown';
    }
  }

  formatWorkMinutes(m: number | null | undefined): string {
    if (m == null || m < 0) return '—';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}h ${min}m`;
  }

  readonly directoryColumns: SharedTableColumn<EmployeeAttendanceDirectoryRowDto>[] = [
    { id: 'employeeName', header: 'employee_attendance.col_name', valueGetter: (r) => r.employeeName || '—' },
    { id: 'employeeCode', header: 'employee_attendance.col_code', valueGetter: (r) => r.employeeCode || '—' },
    { id: 'departmentName', header: 'employee_attendance.col_dept', valueGetter: (r) => r.departmentName || '—' },
    { id: 'planName', header: 'employee_attendance.col_plan', valueGetter: (r) => r.planName || '—' },
    { id: 'shiftsSummary', header: 'employee_attendance.col_shifts', valueGetter: (r) => r.shiftsSummary || '—' },
    {
      id: 'scheduleEntryCount',
      header: 'employee_attendance.col_schedule_count',
      valueGetter: (r) => r.scheduleEntryCount ?? 0,
      align: 'center',
    },
  ];

  readonly directoryActions: SharedTableAction<EmployeeAttendanceDirectoryRowDto>[] = [
    {
      id: 'view',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openDetail(row),
    },
  ];

  readonly detailColumns: SharedTableColumn<EmployeeScheduleAttendanceDetailDto>[] = [
    { id: 'scheduleDate', header: 'employee_attendance.col_date', valueGetter: (d) => d.scheduleDate || '—' },
    {
      id: 'dayType',
      header: 'employee_attendance.col_day_type',
    },
    { id: 'isHoliday', header: 'employee_attendance.col_holiday', align: 'center' },
    { id: 'shiftName', header: 'employee_attendance.col_shift', valueGetter: (d) => d.shiftName || '—' },
    { id: 'attendanceStatus', header: 'employee_attendance.col_status', valueGetter: (d) => d.attendanceStatus || '—' },
    { id: 'actualIn', header: 'employee_attendance.col_in' },
    { id: 'actualOut', header: 'employee_attendance.col_out' },
    { id: 'netWorkMinutes', header: 'employee_attendance.col_net', valueGetter: (d) => this.formatWorkMinutes(d.netWorkMinutes) },
    { id: 'notes', header: 'employee_attendance.col_notes', valueGetter: (d) => d.notes || '—' },
  ];
}
