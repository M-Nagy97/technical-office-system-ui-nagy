import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, map } from 'rxjs/operators';
import {
  AttendanceRawService,
  EmployeesService,
  EmployeeDto,
  ImportAttendanceRawCommand,
  PunchDirection,
  AttendanceSource,
  AttendanceRawDto,
  ListAttendanceRawForRangeQuery,
} from '../../../core/api/generated';
import * as XLSX from 'xlsx';
import { parseAttendanceImportCsv, parseAttendanceImportXlsx } from './attendance-import.helpers';

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
    TableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    TranslateModule,
  ],
  providers: [MessageService],
  templateUrl: './daily-attendance.component.html',
  styleUrl: './daily-attendance.component.scss',
})
export class DailyAttendanceComponent implements OnInit {
  private readonly attendanceRawApi = inject(AttendanceRawService);
  private readonly employeesApi = inject(EmployeesService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  readonly dateFrom = signal(startOfMonth(new Date()));
  readonly dateTo = signal(new Date());

  readonly employeeOptions = signal<{ label: string; value: string }[]>([]);
  private readonly employeeLabelById = signal<Map<string, string>>(new Map());

  readonly selectedEmployeeIds = signal<string[]>([]);

  readonly rawRows = signal<AttendanceRawDto[]>([]);
  readonly loadingGrid = signal(false);
  readonly togglingId = signal<string | null>(null);

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

  readonly punchEmployeeId = signal<string | null>(null);
  readonly punchTime = signal(new Date());
  readonly punchType = signal<0 | 1>(0);
  readonly punchNotes = signal('');

  get punchTypeOptions(): { label: string; value: 0 | 1 }[] {
    return [
      { label: this.translate.instant('daily_attendance_page.dir_in'), value: 0 },
      { label: this.translate.instant('daily_attendance_page.dir_out'), value: 1 },
    ];
  }

  ngOnInit(): void {
    this.employeesApi.employeesGetAll().pipe(map((res: any) => res.data ?? [])).subscribe({
      next: (list: EmployeeDto[]) => {
        const opts = list
          .filter((e) => e.id)
          .map((e) => ({ label: employeeLabel(e), value: e.id! }));
        this.employeeOptions.set(opts);
        this.employeeLabelById.set(new Map(opts.map((o) => [o.value, o.label])));
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
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const locale = this.translate.currentLang === 'ar' ? 'ar-EG' : undefined;
      return d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return '—';
    }
  }

  directionLabel(d: PunchDirection | undefined): string {
    if (d === PunchDirection.NUMBER_1) return this.translate.instant('daily_attendance_page.dir_in');
    if (d === PunchDirection.NUMBER_2) return this.translate.instant('daily_attendance_page.dir_out');
    return this.translate.instant('daily_attendance_page.dir_unknown');
  }

  sourceLabel(s: AttendanceSource | undefined): string {
    if (s === AttendanceSource.NUMBER_1) return 'Device';
    if (s === AttendanceSource.NUMBER_2) return 'Manual';
    if (s === AttendanceSource.NUMBER_3) return 'Other';
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

  openManualPunchDialog(): void {
    const d = this.dateTo();
    this.punchEmployeeId.set(null);
    this.punchTime.set(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0, 0));
    this.punchType.set(0);
    this.punchNotes.set('');
    this.showManualPunchDialog.set(true);
  }

  closeManualPunchDialog(): void {
    this.showManualPunchDialog.set(false);
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
    this.savingPunch.set(true);
    const t = this.punchTime();
    const cmd: ImportAttendanceRawCommand = {
      punches: [
        {
          empId: employeeId,
          fingerTime: t.toISOString(),
          direction: this.punchType() === 0 ? PunchDirection.NUMBER_1 : PunchDirection.NUMBER_2,
          source: AttendanceSource.NUMBER_2,
          deviceId: null,
        },
      ],
    };

    this.attendanceRawApi
      .attendanceRawImport(cmd)
      .pipe(finalize(() => this.savingPunch.set(false)))
      .subscribe({
        next: (imp) => {
          if (!imp.success) {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('common.error') || 'Error',
              detail: imp.message ?? this.translate.instant('daily_attendance_page.import_failed'),
            });
            return;
          }
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success') || 'OK',
            detail: this.translate.instant('daily_attendance_page.saved_punch'),
          });
          this.closeManualPunchDialog();
          this.loadGrid();
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error') || 'Error',
            detail: this.translate.instant('daily_attendance_page.import_failed'),
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
            detail: e?.message ?? 'Failed to read file',
          });
        }
      };
      reader.onerror = () => {
        this.importingFile.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to read file' });
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
            detail: e?.message ?? 'Failed to read file',
          });
        }
      };
      reader.onerror = () => {
        this.importingFile.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to read file' });
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    this.importingFile.set(false);
    this.messageService.add({
      severity: 'warn',
      summary: 'File type',
      detail: 'Use CSV or Excel (.xlsx / .xls)',
    });
  }

  private uploadPunches(punches: AttendanceRawDto[]): void {
    if (!punches.length) {
      this.importingFile.set(false);
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning') || 'Warning',
        detail: 'No data rows',
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
