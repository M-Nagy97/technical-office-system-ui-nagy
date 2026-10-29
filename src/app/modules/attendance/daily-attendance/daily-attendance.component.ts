import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import {
  AttendanceRawService,
  AttendanceCalcService,
  EmployeesService,
  EmployeeDto,
  ImportAttendanceRawCommand,
  PunchDirection,
  AttendanceSource,
  AttendanceStatus,
  AttendanceRawDto,
  AttendanceCalcDto,
  ListAttendanceRawForRangeQuery,
} from '../../../core/api/generated';
import * as XLSX from 'xlsx';
import { parseAttendanceImportCsv, parseAttendanceImportXlsx } from './attendance-import.helpers';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PermissionService } from '../../../core/auth/permission.service';
import { ErpPermissions } from '../../../core/auth/erp-permissions';
import {
  AttendanceApiService,
  AttendanceLeaveOverlayDay,
  AttendancePermissionKind,
  AttendancePermissionOverlay,
} from '../../../core/services/attendance-api.service';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { TimeInputComponent } from '../../../shared/components/time-input/time-input.component';
import { formatAppTime, parseTimeToDate } from '../../../shared/utils/date.utils';

type RegisterMode = 'in' | 'out';

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function combineDateAndTime(date: Date, time: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0, 0);
}

function toLocalIsoDateTime(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

interface DailyAttendanceEmployeeGroup {
  empId: string;
  employeeName: string;
  punchCount: number;
  countingInCalc: number;
}

interface DailyRegisterRow {
  empId: string;
  employeeName: string;
  shiftName: string | null;
  actualIn: string | null;
  actualOut: string | null;
  status: AttendanceStatus | null;
  netWorkMinutes: number | null;
  notes: string | null;
  leaveTypeName: string | null;
  leaveTypeArabicName: string | null;
  leaveStartDate: string | null;
  leaveEndDate: string | null;
  isCompensatoryLeave: boolean;
  permissions: AttendancePermissionOverlay[];
  workedDuringApprovedLeave: boolean;
}

function employeeLabel(e: EmployeeDto): string {
  const ar = e.arabicName?.trim();
  if (ar) return ar;
  const parts = [e.firstName, e.lastName].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  return e.employeeCode ?? e.id ?? '';
}

@Component({
  selector: 'app-daily-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    MultiSelectModule,
    TagModule,
    DialogModule,
    InputTextModule,
    TabViewModule,
    TranslateModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    HasPermissionDirective,
    FilterBarComponent,
    TimeInputComponent,
  ],
  templateUrl: './daily-attendance.component.html',
  styleUrl: './daily-attendance.component.scss',
})
export class DailyAttendanceComponent implements OnInit {
  private readonly attendanceRawApi = inject(AttendanceRawService);
  private readonly attendanceCalcApi = inject(AttendanceCalcService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly employeesApi = inject(EmployeesService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly permission = inject(PermissionService);

  readonly canWrite = computed(() => this.permission.has(ErpPermissions.timeAttendanceWrite));

  readonly workDate = signal(new Date());
  readonly sheetSearch = signal('');
  readonly sheetRows = signal<DailyRegisterRow[]>([]);
  readonly loadingSheet = signal(false);

  readonly filteredSheetRows = computed(() => {
    const q = this.sheetSearch().trim().toLowerCase();
    const rows = this.sheetRows();
    if (!q) return rows;
    return rows.filter((r) => r.employeeName.toLowerCase().includes(q) || r.empId.toLowerCase().includes(q));
  });

  readonly sheetColumns: SharedTableColumn<DailyRegisterRow>[] = [
    {
      id: 'employeeName',
      header: 'daily_attendance_page.col_employee',
      field: 'employeeName',
      align: 'start',
      cellClass: 'font-medium',
    },
    { id: 'shiftName', header: 'daily_attendance_page.col_shift', align: 'start' },
    { id: 'actualIn', header: 'daily_attendance_page.col_in', align: 'start' },
    { id: 'actualOut', header: 'daily_attendance_page.col_out', align: 'start' },
    { id: 'overlay', header: 'daily_attendance_page.col_leave_permission', align: 'start' },
    { id: 'status', header: 'daily_attendance_page.col_status' },
    { id: 'hours', header: 'daily_attendance_page.col_hours', align: 'end' },
  ];

  readonly sheetActions: SharedTableAction<DailyRegisterRow>[] = [
    {
      id: 'register-in',
      icon: 'pi pi-sign-in',
      tooltip: 'daily_attendance_page.register_in',
      visible: () => this.canWrite(),
      onClick: (row) => this.openRegisterDialog('in', row),
    },
    {
      id: 'register-out',
      icon: 'pi pi-sign-out',
      tooltip: 'daily_attendance_page.register_out',
      visible: () => this.canWrite(),
      onClick: (row) => this.openRegisterDialog('out', row),
    },
  ];

  readonly dateFrom = signal(startOfMonth(new Date()));
  readonly dateTo = signal(new Date());

  readonly employeeOptions = signal<{ label: string; value: string }[]>([]);
  private readonly employeeLabelById = signal<Map<string, string>>(new Map());

  readonly selectedEmployeeIds = signal<string[]>([]);

  readonly rawRows = signal<AttendanceRawDto[]>([]);
  readonly loadingGrid = signal(false);
  readonly togglingId = signal<string | null>(null);

  readonly employeeSummaryColumns: SharedTableColumn<DailyAttendanceEmployeeGroup>[] = [
    {
      id: 'employeeName',
      header: 'daily_attendance_page.col_employee',
      field: 'employeeName',
      align: 'start',
      cellClass: 'font-medium',
    },
    {
      id: 'punchCount',
      header: 'daily_attendance_page.col_punch_count',
      field: 'punchCount',
      align: 'end',
    },
    {
      id: 'countingInCalc',
      header: 'daily_attendance_page.col_counting_in_calc',
      field: 'countingInCalc',
      align: 'end',
    },
  ];

  readonly employeeSummaryActions: SharedTableAction<DailyAttendanceEmployeeGroup>[] = [
    {
      id: 'view',
      icon: 'pi pi-eye',
      label: 'daily_attendance_page.view',
      onClick: (row) => this.openEmployeeDetail(row.empId),
    },
  ];

  readonly detailRowClass = (row: AttendanceRawDto): string => (row.ignoredByCalculation ? 'raw-row-ignored' : '');

  readonly detailColumns: SharedTableColumn<AttendanceRawDto>[] = [
    {
      id: 'date',
      header: 'daily_attendance_page.col_date',
      valueGetter: (row) => this.formatFingerDate(row.fingerTime),
      align: 'start',
    },
    {
      id: 'time',
      header: 'daily_attendance_page.col_time',
      valueGetter: (row) => this.formatFingerClock(row.fingerTime),
      align: 'start',
      cellClass: 'font-mono text-900',
    },
    {
      id: 'direction',
      header: 'daily_attendance_page.col_direction',
      valueGetter: (row) => this.directionLabel(row.direction),
    },
    {
      id: 'source',
      header: 'daily_attendance_page.col_source',
      valueGetter: (row) => this.sourceLabel(row.source),
    },
    {
      id: 'processed',
      header: 'daily_attendance_page.col_processed',
      cellClass: (row) => (row.isProcessed ? 'font-medium' : 'text-600'),
    },
    {
      id: 'inCalc',
      header: 'daily_attendance_page.col_in_calc',
    },
  ];

  readonly detailActions: SharedTableAction<AttendanceRawDto>[] = [
    {
      id: 'exclude',
      icon: 'pi pi-ban',
      label: 'daily_attendance_page.exclude',
      visible: (row) => !row.ignoredByCalculation,
      disabled: (row) => !row.id || this.togglingId() !== null,
      loading: (row) => this.togglingId() === row.id,
      buttonClass: 'p-button-warning',
      onClick: (row) => this.setRowIgnored(row, true),
    },
    {
      id: 'include',
      icon: 'pi pi-check',
      label: 'daily_attendance_page.include',
      visible: (row) => !!row.ignoredByCalculation,
      disabled: (row) => !row.id || this.togglingId() !== null,
      loading: (row) => this.togglingId() === row.id,
      onClick: (row) => this.setRowIgnored(row, false),
    },
  ];

  readonly showEmployeeDetailDialog = signal(false);
  readonly detailEmployeeId = signal<string | null>(null);

  readonly employeeGroups = computed((): DailyAttendanceEmployeeGroup[] => {
    const rows = this.rawRows();
    const labelMap = this.employeeLabelById();
    const byEmp = new Map<string, AttendanceRawDto[]>();
    for (const r of rows) {
      const id = r.empId ?? '';
      if (!id) continue;
      if (!byEmp.has(id)) byEmp.set(id, []);
      byEmp.get(id)!.push(r);
    }
    const groups: DailyAttendanceEmployeeGroup[] = [];
    for (const [empId, punches] of byEmp) {
      const countingInCalc = punches.filter((p) => !p.ignoredByCalculation).length;
      groups.push({
        empId,
        employeeName: labelMap.get(empId) ?? empId,
        punchCount: punches.length,
        countingInCalc,
      });
    }
    groups.sort((a, b) => a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: 'base' }));
    return groups;
  });

  readonly punchesForDetailDialog = computed(() => {
    const id = this.detailEmployeeId();
    if (!id) return [];
    return this.rawRows()
      .filter((r) => r.empId === id)
      .slice()
      .sort((a, b) => {
        const ta = a.fingerTime ? new Date(a.fingerTime).getTime() : 0;
        const tb = b.fingerTime ? new Date(b.fingerTime).getTime() : 0;
        return ta - tb;
      });
  });

  readonly detailEmployeeName = computed(() => {
    const id = this.detailEmployeeId();
    if (!id) return '';
    return this.employeeLabelById().get(id) ?? id;
  });

  readonly savingPunch = signal(false);
  readonly importingFile = signal(false);
  readonly showManualPunchDialog = signal(false);
  readonly registerMode = signal<RegisterMode>('in');

  readonly punchEmployeeId = signal<string | null>(null);
  readonly punchWorkDate = signal(new Date());
  readonly punchInTime = signal<Date | null>(null);
  readonly punchOutTime = signal<Date | null>(null);
  readonly punchNotes = signal('');

  onPunchTimeChange(target: 'in' | 'out', value: Date | string | null | undefined): void {
    const parsed = value instanceof Date ? value : parseTimeToDate(value);
    if (target === 'in') {
      this.punchInTime.set(parsed);
    } else {
      this.punchOutTime.set(parsed);
    }
  }

  readonly dialogHeaderKey = computed(() =>
    this.registerMode() === 'in'
      ? 'daily_attendance_page.register_in_header'
      : 'daily_attendance_page.register_out_header'
  );

  ngOnInit(): void {
    this.employeesApi.employeesGetAll().pipe(map((res: any) => res.data ?? [])).subscribe({
      next: (list: EmployeeDto[]) => {
        const opts = list
          .filter((e) => e.id)
          .map((e) => ({ label: employeeLabel(e), value: e.id! }));
        this.employeeOptions.set(opts);
        this.employeeLabelById.set(new Map(opts.map((o) => [o.value, o.label])));
        this.loadSheet();
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error') || 'Error',
          detail: this.translate.instant('daily_attendance_page.employees_load_failed'),
        }),
    });
  }

  nameForEmp(id: string | null | undefined): string {
    if (!id) return '—';
    return this.employeeLabelById().get(id) ?? id;
  }

  formatFingerDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const locale = this.translate.currentLang === 'ar' ? 'ar-EG' : undefined;
      return d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return '—';
    }
  }

  formatFingerClock(iso: string | null | undefined): string {
    return formatAppTime(iso, this.translate.currentLang, { withSeconds: true });
  }

  directionLabel(d: PunchDirection | undefined): string {
    if (d === PunchDirection.NUMBER_1) return this.translate.instant('daily_attendance_page.dir_in');
    if (d === PunchDirection.NUMBER_2) return this.translate.instant('daily_attendance_page.dir_out');
    return this.translate.instant('daily_attendance_page.dir_unknown');
  }

  sourceLabel(s: AttendanceSource | undefined): string {
    if (s === AttendanceSource.NUMBER_1) return this.translate.instant('daily_attendance_page.src_device');
    if (s === AttendanceSource.NUMBER_2) return this.translate.instant('daily_attendance_page.src_manual');
    if (s === AttendanceSource.NUMBER_3) return this.translate.instant('daily_attendance_page.src_import');
    return '—';
  }

  loadGrid(): void {
    const ids = this.selectedEmployeeIds();
    if (!ids.length) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning') || 'Warning',
        detail: this.translate.instant('daily_attendance_page.pick_employees'),
      });
      return;
    }
    const from = this.dateFrom();
    const to = this.dateTo();
    if (from > to) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning') || 'Warning',
        detail: this.translate.instant('daily_attendance_page.invalid_range'),
      });
      return;
    }

    const body: ListAttendanceRawForRangeQuery = {
      employeeIds: ids,
      from: toYmdLocal(from),
      to: toYmdLocal(to),
    };

    this.loadingGrid.set(true);
    this.attendanceRawApi.attendanceRawListRange(body).subscribe({
      next: (res) => {
        this.loadingGrid.set(false);
        if (!res.success) {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error') || 'Error',
            detail: res.message ?? this.translate.instant('daily_attendance_page.load_failed'),
          });
          return;
        }
        this.rawRows.set([...(res.data ?? [])]);
      },
      error: () => {
        this.loadingGrid.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error') || 'Error',
          detail: this.translate.instant('daily_attendance_page.load_failed'),
        });
      },
    });
  }

  setRowIgnored(row: AttendanceRawDto, ignored: boolean): void {
    const id = row.id;
    if (!id) return;
    this.togglingId.set(id);
    this.attendanceRawApi
      .attendanceRawSetIgnoredByCalculation({ id, ignoredByCalculation: ignored })
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('common.error') || 'Error',
              detail: res.message ?? this.translate.instant('daily_attendance_page.toggle_failed'),
            });
            return;
          }
          this.rawRows.update((list) =>
            list.map((r) => (r.id === id ? { ...r, ignoredByCalculation: ignored } : r))
          );
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error') || 'Error',
            detail: this.translate.instant('daily_attendance_page.toggle_failed'),
          }),
      });
  }

  onDateFromChange(d: Date): void {
    this.dateFrom.set(d);
  }

  onDateToChange(d: Date): void {
    this.dateTo.set(d);
  }

  openRegisterDialog(mode: RegisterMode, row?: DailyRegisterRow): void {
    const date = this.workDate();
    this.registerMode.set(mode);
    this.punchEmployeeId.set(row?.empId ?? null);
    this.punchWorkDate.set(new Date(date));
    this.punchNotes.set(row?.notes ?? '');
    if (mode === 'in') {
      this.punchInTime.set(
        row?.actualIn
          ? new Date(row.actualIn)
          : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0, 0, 0)
      );
      this.punchOutTime.set(null);
    } else {
      this.punchOutTime.set(
        row?.actualOut
          ? new Date(row.actualOut)
          : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16, 30, 0, 0)
      );
      this.punchInTime.set(null);
    }
    this.showManualPunchDialog.set(true);
  }

  closeManualPunchDialog(): void {
    this.showManualPunchDialog.set(false);
  }

  onWorkDateChange(d: Date): void {
    this.workDate.set(d);
    this.loadSheet();
  }

  loadSheet(): void {
    const date = this.workDate();
    const ymd = toYmdLocal(date);
    this.loadingSheet.set(true);
    forkJoin({
      calc: this.attendanceCalcApi.attendanceCalcGet(undefined, ymd, ymd),
      overlay: this.attendanceApi.getLeaveOverlay(ymd, ymd).pipe(catchError(() => of([] as AttendanceLeaveOverlayDay[]))),
    }).subscribe({
      next: ({ calc, overlay }) => {
        this.loadingSheet.set(false);
        const calcs = calc.data ?? [];
        const byEmp = new Map(calcs.filter((c) => c.empId).map((c) => [c.empId!, c]));
        const overlayByEmp = new Map(
          (overlay ?? [])
            .filter((o) => o.employeeId)
            .map((o) => [o.employeeId!, o])
        );
        const labels = this.employeeLabelById();
        const rows: DailyRegisterRow[] = [];
        const seen = new Set<string>();
        for (const opt of this.employeeOptions()) {
          seen.add(opt.value);
          const calcRow = byEmp.get(opt.value);
          rows.push(this.toRegisterRow(opt.value, opt.label, calcRow, overlayByEmp.get(opt.value)));
        }
        for (const calcRow of calcs) {
          const id = calcRow.empId;
          if (!id || seen.has(id)) continue;
          seen.add(id);
          rows.push(this.toRegisterRow(id, labels.get(id) ?? calcRow.employeeName ?? id, calcRow, overlayByEmp.get(id)));
        }
        for (const [empId, overlayRow] of overlayByEmp) {
          if (seen.has(empId)) continue;
          rows.push(this.toRegisterRow(empId, labels.get(empId) ?? empId, null, overlayRow));
        }
        rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: 'base' }));
        this.sheetRows.set(rows);
      },
      error: () => {
        this.loadingSheet.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error') || 'Error',
          detail: this.translate.instant('daily_attendance_page.load_sheet_failed'),
        });
      },
    });
  }

  formatHours(mins: number | null | undefined): string {
    if (mins == null) return '—';
    const sign = mins < 0 ? '-' : '';
    const abs = Math.abs(mins);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h}:${String(m).padStart(2, '0')}`;
  }

  statusLabel(status: AttendanceStatus | null | undefined): string {
    const key = this.statusKey(status);
    if (!key) return '—';
    return this.translate.instant(`calculation_workbench.attendance_status.${key}`);
  }

  statusSeverity(status: AttendanceStatus | null | undefined): 'success' | 'danger' | 'warning' | 'info' | 'secondary' {
    switch (status) {
      case AttendanceStatus.NUMBER_1:
        return 'success';
      case AttendanceStatus.NUMBER_2:
        return 'danger';
      case AttendanceStatus.NUMBER_3:
      case AttendanceStatus.NUMBER_4:
        return 'warning';
      case AttendanceStatus.NUMBER_5:
      case AttendanceStatus.NUMBER_6:
        return 'info';
      case AttendanceStatus.NUMBER_7:
        return 'secondary';
      case AttendanceStatus.NUMBER_8:
      case AttendanceStatus.NUMBER_9:
        return 'info';
      default:
        return 'secondary';
    }
  }

  private statusKey(status: AttendanceStatus | null | undefined): string | null {
    switch (status) {
      case AttendanceStatus.NUMBER_1:
        return 'present';
      case AttendanceStatus.NUMBER_2:
        return 'absent';
      case AttendanceStatus.NUMBER_3:
        return 'late';
      case AttendanceStatus.NUMBER_4:
        return 'early_leave';
      case AttendanceStatus.NUMBER_5:
        return 'overtime';
      case AttendanceStatus.NUMBER_6:
        return 'half_day';
      case AttendanceStatus.NUMBER_7:
        return 'holiday';
      case AttendanceStatus.NUMBER_8:
        return 'compensatory';
      case AttendanceStatus.NUMBER_9:
        return 'on_leave';
      default:
        return null;
    }
  }

  leaveTag(row: DailyRegisterRow): string | null {
    const name = row.leaveTypeArabicName || row.leaveTypeName;
    if (!name) return null;
    const from = row.leaveStartDate ?? '';
    const to = row.leaveEndDate ?? '';
    const dates = from && to ? ` ${from} – ${to}` : '';
    return `${this.translate.instant('daily_attendance_page.leave_tag')}: ${name}${dates}`;
  }

  permissionChip(p: AttendancePermissionOverlay): string {
    const name = p.permissionTypeArabicName || p.permissionTypeName || this.translate.instant('daily_attendance_page.permission_chip');
    if (p.kind === AttendancePermissionKind.HalfDay) {
      const period = p.isMorning
        ? this.translate.instant('daily_attendance_page.permission_morning')
        : this.translate.instant('daily_attendance_page.permission_afternoon');
      return `${name} - ${period}`;
    }
    const from = this.formatClock(p.fromTime);
    const to = this.formatClock(p.toTime);
    if (from && to) return `${name} ${from} - ${to}`;
    return name;
  }

  private formatClock(value: string | null | undefined): string {
    if (!value) return '';
    return value.length >= 5 ? value.slice(0, 5) : value;
  }

  private toRegisterRow(
    empId: string,
    employeeName: string,
    calc?: AttendanceCalcDto | null,
    overlay?: AttendanceLeaveOverlayDay | null
  ): DailyRegisterRow {
    const permissions = overlay?.permissions ?? [];
    const hasLeave = !!(overlay?.leaveTypeName || overlay?.leaveTypeArabicName || overlay?.leaveRequestId);
    return {
      empId,
      employeeName: calc?.employeeName || employeeName,
      shiftName: calc?.shiftName ?? null,
      actualIn: calc?.actualIn ?? null,
      actualOut: calc?.actualOut ?? null,
      status: calc?.status ?? null,
      netWorkMinutes: calc?.netWorkMinutes ?? null,
      notes: calc?.notes ?? null,
      leaveTypeName: overlay?.leaveTypeName ?? null,
      leaveTypeArabicName: overlay?.leaveTypeArabicName ?? null,
      leaveStartDate: overlay?.leaveStartDate ?? null,
      leaveEndDate: overlay?.leaveEndDate ?? null,
      isCompensatoryLeave: overlay?.isCompensatoryLeave ?? false,
      permissions,
      workedDuringApprovedLeave: hasLeave && !!(calc?.actualIn || calc?.actualOut),
    };
  }

  private applyCalcToSheet(calc: AttendanceCalcDto): void {
    const empId = calc.empId;
    if (!empId) return;
    const name = this.employeeLabelById().get(empId) ?? calc.employeeName ?? empId;
    const existing = this.sheetRows().find((r) => r.empId === empId);
    const overlay: AttendanceLeaveOverlayDay | null = existing
      ? {
          employeeId: empId,
          leaveTypeName: existing.leaveTypeName,
          leaveTypeArabicName: existing.leaveTypeArabicName,
          leaveStartDate: existing.leaveStartDate,
          leaveEndDate: existing.leaveEndDate,
          isCompensatoryLeave: existing.isCompensatoryLeave,
          permissions: existing.permissions,
        }
      : null;
    const next = this.toRegisterRow(empId, name, calc, overlay);
    const list = this.sheetRows();
    const idx = list.findIndex((r) => r.empId === empId);
    if (idx === -1) {
      this.sheetRows.set([...list, next].sort((a, b) => a.employeeName.localeCompare(b.employeeName, undefined, { sensitivity: 'base' })));
      return;
    }
    const copy = list.slice();
    copy[idx] = next;
    this.sheetRows.set(copy);
  }

  openEmployeeDetail(empId: string): void {
    this.detailEmployeeId.set(empId);
    this.showEmployeeDetailDialog.set(true);
  }

  closeEmployeeDetailDialog(): void {
    this.showEmployeeDetailDialog.set(false);
    this.detailEmployeeId.set(null);
  }

  saveManualPunch(): void {
    const employeeId = this.punchEmployeeId();
    if (!employeeId) return;
    const date = this.punchWorkDate();
    const mode = this.registerMode();
    const time = mode === 'in' ? this.punchInTime() : this.punchOutTime();
    if (!time) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning') || 'Warning',
        detail: this.translate.instant('daily_attendance_page.no_times'),
      });
      return;
    }

    const stamp = combineDateAndTime(date, time);
    this.savingPunch.set(true);
    this.attendanceApi
      .registerManualAttendance({
        employeeId,
        workDate: toYmdLocal(date),
        actualIn: mode === 'in' ? toLocalIsoDateTime(stamp) : null,
        actualOut: mode === 'out' ? toLocalIsoDateTime(stamp) : null,
        notes: this.punchNotes() || null,
      })
      .pipe(finalize(() => this.savingPunch.set(false)))
      .subscribe({
        next: (calc) => {
          this.applyCalcToSheet(calc);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success') || 'OK',
            detail: this.translate.instant(
              mode === 'in' ? 'daily_attendance_page.saved_in' : 'daily_attendance_page.saved_out'
            ),
          });
          this.closeManualPunchDialog();
          if (this.selectedEmployeeIds().length) this.loadGrid();
        },
        error: (err) =>
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error') || 'Error',
            detail: err?.error?.message ?? err?.message ?? this.translate.instant('daily_attendance_page.register_failed'),
          }),
      });
  }

  downloadTemplate(): void {
    const rows = [
      ['EmpId', 'FingerTime', 'Direction', 'DeviceId'],
      ['11111111-1111-1111-1111-111111111111', '2025-03-01T08:00:00', 'In', ''],
      ['11111111-1111-1111-1111-111111111111', '2025-03-01T16:00:00', 'Out', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Punches');
    XLSX.writeFile(wb, 'attendance-raw-import-template.xlsx');
  }

  onAttendanceFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const lower = file.name.toLowerCase();
    this.importingFile.set(true);
    if (lower.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result ?? '');
          const punches = parseAttendanceImportCsv(text);
          this.uploadPunches(punches);
        } catch (e: any) {
          this.importingFile.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'CSV',
            detail: e?.message ?? this.translate.instant('daily_attendance_page.file_read_failed'),
          });
        }
      };
      reader.onerror = () => {
        this.importingFile.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error') || 'Error',
          detail: this.translate.instant('daily_attendance_page.file_read_failed'),
        });
      };
      reader.readAsText(file, 'UTF-8');
      return;
    }
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buf = reader.result as ArrayBuffer;
          const punches = parseAttendanceImportXlsx(buf);
          this.uploadPunches(punches);
        } catch (e: any) {
          this.importingFile.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Excel',
            detail: e?.message ?? this.translate.instant('daily_attendance_page.file_read_failed'),
          });
        }
      };
      reader.onerror = () => {
        this.importingFile.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error') || 'Error',
          detail: this.translate.instant('daily_attendance_page.file_read_failed'),
        });
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    this.importingFile.set(false);
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.instant('daily_attendance_page.file_type'),
      detail: this.translate.instant('daily_attendance_page.file_type_hint'),
    });
  }

  private uploadPunches(punches: AttendanceRawDto[]): void {
    if (!punches.length) {
      this.importingFile.set(false);
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning') || 'Warning',
        detail: this.translate.instant('daily_attendance_page.no_data_rows'),
      });
      return;
    }
    const cmd: ImportAttendanceRawCommand = { punches };
    this.attendanceRawApi.attendanceRawImport(cmd).subscribe({
      next: (res) => {
        this.importingFile.set(false);
        if (!res.success) {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error') || 'Error',
            detail: res.message ?? this.translate.instant('daily_attendance_page.import_failed'),
          });
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success') || 'OK',
          detail: this.translate.instant('daily_attendance_page.import_success', { count: punches.length }),
        });
        this.loadGrid();
      },
      error: () => {
        this.importingFile.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error') || 'Error',
          detail: this.translate.instant('daily_attendance_page.import_failed'),
        });
      },
    });
  }
}
