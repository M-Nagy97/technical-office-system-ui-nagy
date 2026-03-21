import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { forkJoin, EMPTY } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';
import {
  AttendanceRawService,
  EmployeesService,
  EmployeeDto,
  ImportAttendanceRawCommand,
  PunchDirection,
  AttendanceSource,
  AttendanceCalcService,
  RecalculateAttendanceCommand,
  AttendanceRawDto,
} from '../../../core/api/generated';
import * as XLSX from 'xlsx';
import { AttendanceCalculationComponent } from '../attendance-calculation/attendance-calculation.component';
import { parseAttendanceImportCsv, parseAttendanceImportXlsx } from './attendance-import.helpers';

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
    DialogModule,
    InputTextModule,
    ToastModule,
    AttendanceCalculationComponent,
  ],
  providers: [MessageService],
  templateUrl: './daily-attendance.component.html',
  styleUrl: './daily-attendance.component.scss',
})
export class DailyAttendanceComponent implements OnInit {
  private readonly attendanceRawApi = inject(AttendanceRawService);
  private readonly attendanceCalcApi = inject(AttendanceCalcService);
  private readonly employeesApi = inject(EmployeesService);
  private readonly messageService = inject(MessageService);

  readonly selectedDate = signal(new Date());
  /** Bumps child grid refresh after import / manual punch. */
  readonly reloadTick = signal(0);
  readonly savingPunch = signal(false);
  readonly importingFile = signal(false);
  readonly showManualPunchDialog = signal(false);

  readonly employeeOptions = signal<{ label: string; value: string }[]>([]);
  readonly punchEmployeeId = signal<string | null>(null);
  readonly punchTime = signal(new Date());
  readonly punchType = signal<0 | 1>(0);
  readonly punchNotes = signal('');

  readonly punchTypeOptions = [
    { label: 'حضور (دخول)', value: 0 as const },
    { label: 'انصراف (خروج)', value: 1 as const },
  ];

  ngOnInit(): void {
    this.employeesApi.employeesGetAll().pipe(map((res: any) => res.data ?? [])).subscribe({
      next: (list: EmployeeDto[]) => {
        this.employeeOptions.set(
          list
            .filter((e) => e.id)
            .map((e) => ({ label: employeeLabel(e), value: e.id! }))
        );
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذر تحميل قائمة الموظفين',
        }),
    });
  }

  onDateChange(date: Date): void {
    this.selectedDate.set(date);
  }

  openManualPunchDialog(): void {
    const d = this.selectedDate();
    this.punchEmployeeId.set(null);
    this.punchTime.set(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0, 0));
    this.punchType.set(0);
    this.punchNotes.set('');
    this.showManualPunchDialog.set(true);
  }

  closeManualPunchDialog(): void {
    this.showManualPunchDialog.set(false);
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
    const dateStr = toYmdLocal(t);
    const recalc: RecalculateAttendanceCommand = { date: dateStr, employeeIds: [employeeId] };

    this.attendanceRawApi
      .attendanceRawImport(cmd)
      .pipe(
        switchMap((imp) => {
          if (!imp.success) {
            this.messageService.add({
              severity: 'error',
              summary: 'فشل الحفظ',
              detail: imp.message ?? 'رفض الخادم الاستيراد',
            });
            return EMPTY;
          }
          return this.attendanceCalcApi.attendanceCalcRecalculate(recalc);
        }),
        finalize(() => this.savingPunch.set(false))
      )
      .subscribe({
        next: (rec) => {
          if (rec && !rec.success) {
            this.messageService.add({
              severity: 'warn',
              summary: 'تنبيه',
              detail: rec.message ?? 'تم الحفظ لكن إعادة الحساب لم تُؤكد',
            });
          } else {
            this.messageService.add({ severity: 'success', summary: 'تم', detail: 'تم تسجيل البصمة وإعادة الحساب' });
          }
          this.reloadTick.update((n) => n + 1);
          this.closeManualPunchDialog();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل الاتصال أو الحفظ' });
        },
      });
  }

  downloadTemplate(): void {
    const rows = [
      ['EmpId', 'FingerTime', 'Direction', 'DeviceId'],
      [
        '11111111-1111-1111-1111-111111111111',
        '2025-03-01T08:00:00',
        'In',
        '',
      ],
      [
        '11111111-1111-1111-1111-111111111111',
        '2025-03-01T16:00:00',
        'Out',
        '',
      ],
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
            summary: 'ملف CSV',
            detail: e?.message ?? 'تعذر قراءة الملف',
          });
        }
      };
      reader.onerror = () => {
        this.importingFile.set(false);
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر قراءة الملف' });
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
            summary: 'ملف Excel',
            detail: e?.message ?? 'تعذر قراءة الملف',
          });
        }
      };
      reader.onerror = () => {
        this.importingFile.set(false);
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'تعذر قراءة الملف' });
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    this.importingFile.set(false);
    this.messageService.add({
      severity: 'warn',
      summary: 'نوع الملف',
      detail: 'يُقبل CSV أو Excel (.xlsx / .xls)',
    });
  }

  private uploadPunches(punches: AttendanceRawDto[]): void {
    if (!punches.length) {
      this.importingFile.set(false);
      this.messageService.add({ severity: 'warn', summary: 'ملف فارغ', detail: 'لا توجد صفوف بيانات' });
      return;
    }
    const cmd: ImportAttendanceRawCommand = { punches };
    this.attendanceRawApi.attendanceRawImport(cmd).subscribe({
      next: (res) => {
        if (!res.success) {
          this.importingFile.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'فشل الرفع',
            detail: res.message ?? 'رفض الخادم الاستيراد',
          });
          return;
        }
        const empIds = [...new Set(punches.map((p) => p.empId).filter(Boolean) as string[])];
        const dates = [
          ...new Set(
            punches
              .map((p) => {
                if (!p.fingerTime) return null;
                return toYmdLocal(new Date(p.fingerTime));
              })
              .filter(Boolean) as string[]
          ),
        ];
        if (!dates.length) {
          this.importingFile.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'تم الاستيراد',
            detail: `تم استيراد ${punches.length} سجلًا`,
          });
          this.reloadTick.update((n) => n + 1);
          return;
        }
        const recalcs = dates.map((d) =>
          this.attendanceCalcApi.attendanceCalcRecalculate({
            date: d,
            employeeIds: empIds.length ? empIds : null,
          })
        );
        forkJoin(recalcs).subscribe({
          next: () => {
            this.importingFile.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: `تم استيراد ${punches.length} سجلًا وإعادة الحساب لـ ${dates.length} يومًا`,
            });
            this.reloadTick.update((n) => n + 1);
          },
          error: () => {
            this.importingFile.set(false);
            this.messageService.add({
              severity: 'warn',
              summary: 'استيراد فقط',
              detail: 'تم الاستيراد لكن تعذر تأكيد إعادة الحساب لبعض الأيام',
            });
            this.reloadTick.update((n) => n + 1);
          },
        });
      },
      error: () => {
        this.importingFile.set(false);
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل رفع الملف' });
      },
    });
  }
}
