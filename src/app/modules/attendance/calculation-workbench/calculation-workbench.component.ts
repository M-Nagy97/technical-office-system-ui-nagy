import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { finalize, map, takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  AttendanceCalcService,
  AttendanceCalculationPreviewDayDto,
  AttendanceCalculationPreviewDayDtoScheduleDayTypeEnum,
  AttendanceCalculationPreviewRowDto,
  AttendanceStatus,
  CommitAttendanceCalculationCommand,
  PlansService,
  PreviewAttendanceCalculationEmployeeDaysQuery,
  PreviewAttendanceCalculationQuery,
  PunchPairingMethod,
  ShiftsService,
} from '../../../core/api/generated';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-calculation-workbench',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    CalendarModule,
    RadioButtonModule,
    ToastModule,
    DialogModule,
    TranslatePipe,
  ],
  providers: [MessageService],
  templateUrl: './calculation-workbench.component.html',
  styleUrl: './calculation-workbench.component.scss',
})
export class CalculationWorkbenchComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly calcApi = inject(AttendanceCalcService);
  private readonly plansApi = inject(PlansService);
  private readonly shiftsApi = inject(ShiftsService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly PunchPairingMethod = PunchPairingMethod;

  readonly planOptions = signal<{ label: string; value: string }[]>([]);
  readonly shiftOptions = signal<{ label: string; value: string }[]>([]);
  readonly previewRows = signal<AttendanceCalculationPreviewRowDto[]>([]);
  readonly loadingPreview = signal(false);
  readonly saving = signal(false);

  detailVisible = false;
  detailLoading = false;
  readonly detailRows = signal<AttendanceCalculationPreviewDayDto[]>([]);
  detailEmployeeLabel = '';

  nameFilter = '';
  selectedPlanId: string | null = null;
  selectedShiftId: string | null = null;
  dateFrom = new Date();
  dateTo = new Date();
  pairingMethod: PunchPairingMethod = PunchPairingMethod.NUMBER_1;
  commitNote = '';

  ngOnInit(): void {
    const now = new Date();
    this.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    this.dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildQueryBase(): PreviewAttendanceCalculationQuery {
    return {
      from: toYmd(this.dateFrom),
      to: toYmd(this.dateTo),
      pairingMethod: this.pairingMethod,
      nameFilter: this.nameFilter?.trim() || null,
      planId: this.selectedPlanId,
      shiftId: this.selectedShiftId,
    };
  }

  private buildEmployeeDaysQuery(employeeId: string): PreviewAttendanceCalculationEmployeeDaysQuery {
    const b = this.buildQueryBase();
    return {
      employeeId,
      from: b.from,
      to: b.to,
      pairingMethod: b.pairingMethod,
      nameFilter: b.nameFilter,
      planId: b.planId,
      shiftId: b.shiftId,
    };
  }

  openEmployeeDetail(row: AttendanceCalculationPreviewRowDto): void {
    const id = row.employeeId;
    if (!id) return;

    const from = toYmd(this.dateFrom);
    const to = toYmd(this.dateTo);
    if (!from || !to) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Date range is required.',
      });
      return;
    }

    this.detailEmployeeLabel = row.employeeName || row.employeeCode || id;
    this.detailVisible = true;
    this.detailLoading = true;
    this.detailRows.set([]);

    this.calcApi
      .attendanceCalcPreviewEmployeeDays(this.buildEmployeeDaysQuery(id))
      .pipe(
        finalize(() => (this.detailLoading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          if (res.success === false) {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: res.message || 'Could not load daily breakdown.',
            });
            this.detailVisible = false;
            return;
          }
          this.detailRows.set(res.data ?? []);
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || err?.message || 'Could not load daily breakdown.',
          });
          this.detailVisible = false;
        },
      });
  }

  formatDayType(v?: AttendanceCalculationPreviewDayDtoScheduleDayTypeEnum | null): string {
    if (v == null) return '—';
    const map: Record<AttendanceCalculationPreviewDayDtoScheduleDayTypeEnum, string> = {
      [AttendanceCalculationPreviewDayDtoScheduleDayTypeEnum.NUMBER_1]: 'employee_attendance.day_type.workday',
      [AttendanceCalculationPreviewDayDtoScheduleDayTypeEnum.NUMBER_2]: 'employee_attendance.day_type.weekend',
      [AttendanceCalculationPreviewDayDtoScheduleDayTypeEnum.NUMBER_3]: 'employee_attendance.day_type.public_holiday',
      [AttendanceCalculationPreviewDayDtoScheduleDayTypeEnum.NUMBER_4]: 'employee_attendance.day_type.compensatory',
    };
    return this.translate.instant(map[v] ?? 'employee_attendance.day_type.unknown');
  }

  formatAttendanceStatus(s?: AttendanceStatus): string {
    if (s == null) return '—';
    const keys: Partial<Record<AttendanceStatus, string>> = {
      [AttendanceStatus.NUMBER_1]: 'calculation_workbench.attendance_status.present',
      [AttendanceStatus.NUMBER_2]: 'calculation_workbench.attendance_status.absent',
      [AttendanceStatus.NUMBER_3]: 'calculation_workbench.attendance_status.late',
      [AttendanceStatus.NUMBER_4]: 'calculation_workbench.attendance_status.early_leave',
      [AttendanceStatus.NUMBER_5]: 'calculation_workbench.attendance_status.overtime',
      [AttendanceStatus.NUMBER_6]: 'calculation_workbench.attendance_status.half_day',
      [AttendanceStatus.NUMBER_7]: 'calculation_workbench.attendance_status.holiday',
    };
    const k = keys[s];
    return k ? this.translate.instant(k) : String(s);
  }

  scheduledWorkLabel(yes?: boolean): string {
    if (yes === true) return this.translate.instant('calculation_workbench.yes');
    if (yes === false) return this.translate.instant('calculation_workbench.no');
    return '—';
  }

  calculate(): void {
    const q = this.buildQueryBase();
    if (!q.from || !q.to) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Date range is required.',
      });
      return;
    }

    this.loadingPreview.set(true);
    this.calcApi
      .attendanceCalcPreview(q)
      .pipe(
        finalize(() => this.loadingPreview.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          if (res.success === false) {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: res.message || 'Preview failed.',
            });
            return;
          }
          this.previewRows.set(res.data ?? []);
        },
        error: (err) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || err?.message || 'Preview failed.',
          }),
      });
  }

  save(): void {
    const body: CommitAttendanceCalculationCommand = {
      ...this.buildQueryBase(),
      note: this.commitNote?.trim() || null,
    };
    if (!body.from || !body.to) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Date range is required.',
      });
      return;
    }

    this.saving.set(true);
    this.calcApi
      .attendanceCalcCommit(body)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          if (res.success === false) {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: res.message || 'Save failed.',
            });
            return;
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Saved',
            detail: res.data ?? '',
          });
          this.router.navigate(['/attendance/calculation-runs']);
        },
        error: (err) =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || err?.message || 'Save failed.',
          }),
      });
  }

  formatMinutes(m?: number | null): string {
    if (m == null || m < 0) return '—';
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h <= 0) return `${min}m`;
    return `${h}h ${min}m`;
  }
}
