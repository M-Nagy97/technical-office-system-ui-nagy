import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { AttendanceCalcService, AttendanceRawService, AttendanceCalcDto as AttendanceCalculationResultDto, RecalculateAttendanceCommand } from '../../../core/api/generated';
import { EmployeesService } from '../../../core/api/generated';
import { map } from 'rxjs';

const STATUS_LABELS: Record<number, string> = {
  0: 'في الوقت',
  1: 'متأخر',
  2: 'انصراف مبكر',
  3: 'غائب',
  4: 'حاضر',
  5: 'نصف يوم',
  6: 'إجازة/عطلة',
  7: 'غير محدد',
};

@Component({
  selector: 'app-daily-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    DialogModule,
    TagModule,
    InputTextModule,
  ],
  templateUrl: './daily-attendance.component.html',
  styleUrl: './daily-attendance.component.scss',
})
export class DailyAttendanceComponent implements OnInit {
  private readonly attendanceCalcApi = inject(AttendanceCalcService);
  private readonly attendanceRawApi = inject(AttendanceRawService);
  private readonly employeesApi = inject(EmployeesService);

  readonly selectedDate = signal(new Date());
  readonly results = signal<AttendanceCalculationResultDto[]>([]);
  readonly loading = signal(false);
  readonly runningCalculation = signal(false);
  readonly savingPunch = signal(false);
  readonly showManualPunchDialog = signal(false);

  readonly employeeOptions = signal<{ label: string; value: string }[]>([]);
  readonly punchEmployeeId = signal('');
  readonly punchTime = signal(new Date());
  readonly punchType = signal<0 | 1>(0);
  readonly punchNotes = signal('');

  readonly stats = computed(() => {
    const list = this.results();
    return {
      total: list.length,
      present: list.filter((r) => r.status === 4).length,
      absent: list.filter((r) => r.status === 3).length,
      late: list.filter((r) => r.status === 1).length,
      other: list.length - list.filter((r) => r.status === 4 || r.status === 3 || r.status === 1).length,
    };
  });

  readonly resultsWithNames = computed(() => {
    const list = this.results();
    // This part might need adjustment depending on how we want to handle names
    // For now we'll assume name is in the result or we fetch it
    return list;
  });

  ngOnInit(): void {
    this.employeesApi.employeesGetAll().pipe(map((res: any) => res.data ?? [])).subscribe({
      next: (list) => {
        this.employeeOptions.set(
          list.map((e: any) => ({ label: e.fullName || e.employeeNumber, value: e.id }))
        );
      }
    });
    this.loadForDate(this.selectedDate());
  }

  onDateChange(date: Date): void {
    this.selectedDate.set(date);
    this.loadForDate(date);
  }

  loadForDate(date: Date): void {
    this.loading.set(true);
    const dateStr = date.toISOString().split('T')[0];
    this.attendanceCalcApi.attendanceCalcGet(undefined, dateStr, dateStr).pipe(
      map((res: any) => res.data ?? [])
    ).subscribe({
      next: (list: AttendanceCalculationResultDto[]) => {
        this.results.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  runCalculation(): void {
    this.runningCalculation.set(true);
    const dateStr = this.selectedDate().toISOString().split('T')[0];
    const cmd: RecalculateAttendanceCommand = {
      date: dateStr
    };
    this.attendanceCalcApi.attendanceCalcRecalculate(cmd).subscribe({
      next: () => {
        this.loadForDate(this.selectedDate());
        this.runningCalculation.set(false);
      },
      error: () => this.runningCalculation.set(false),
    });
  }

  openManualPunchDialog(): void {
    const d = this.selectedDate();
    this.punchEmployeeId.set(this.employeeOptions()[0]?.value ?? '');
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
    const cmd = {
      punches: [{
        employeeId,
        date: this.punchTime().toISOString().split('T')[0],
        time: this.punchTime().toLocaleTimeString('en-GB'),
        direction: this.punchType() === 0 ? 0 : 1, // In/Out
        source: 1 // Manual
      }]
    };
    this.attendanceRawApi.attendanceRawImport(cmd).subscribe({
      next: () => {
        this.savingPunch.set(false);
        this.closeManualPunchDialog();
        this.loadForDate(this.selectedDate());
      },
      error: () => this.savingPunch.set(false),
    });
  }

  getStatusLabel(status: number | undefined): string {
    if (status == null) return '—';
    return STATUS_LABELS[status] ?? String(status);
  }

  formatTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  formatMinutes(m: number | null | undefined): string {
    if (m == null) return '—';
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}:${String(min).padStart(2, '0')}`;
  }
}
