import { Component, effect, inject, input, signal, computed, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { map } from 'rxjs/operators';
import {
  AttendanceCalcService,
  AttendanceCalcDto,
  RecalculateAttendanceCommand,
  EmployeePlansService,
  EmployeeAttendanceStatusDto,
} from '../../../core/api/generated';
import { AttendanceStatus } from '../../../core/api/generated';

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const STATUS_LABELS: Record<number, string> = {
  [AttendanceStatus.NUMBER_1]: 'حاضر',
  [AttendanceStatus.NUMBER_2]: 'غائب',
  [AttendanceStatus.NUMBER_3]: 'متأخر',
  [AttendanceStatus.NUMBER_4]: 'انصراف مبكر',
  [AttendanceStatus.NUMBER_5]: 'إضافي',
  [AttendanceStatus.NUMBER_6]: 'نصف يوم',
  [AttendanceStatus.NUMBER_7]: 'عطلة',
};

@Component({
  selector: 'app-attendance-calculation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    MultiSelectModule,
    TagModule,
    MessageModule,
  ],
  templateUrl: './attendance-calculation.component.html',
  styleUrl: './attendance-calculation.component.scss',
})
export class AttendanceCalculationComponent {
  private readonly attendanceCalcApi = inject(AttendanceCalcService);
  private readonly employeePlansApi = inject(EmployeePlansService);

  /** Work day shown in the parent (daily attendance). */
  readonly workDate = input.required<Date>();
  /** Increment from parent after import / manual punch to refetch grid. */
  readonly reloadTick = input(0);

  readonly rows = signal<AttendanceCalcDto[]>([]);
  readonly loading = signal(false);
  readonly runningCalculation = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly employees = signal<EmployeeAttendanceStatusDto[]>([]);
  /** Filter grid to these employees (empty = all). */
  readonly selectedFilterEmpIds = signal<string[]>([]);

  readonly calcScopeOptions = [
    { label: 'كل الموظفين (البصمات غير المعالجة لليوم)', value: 'all' as const },
    { label: 'الموظفون المحددون في الفلتر فقط', value: 'filtered' as const },
  ];
  readonly calcScope = signal<'all' | 'filtered'>('all');

  readonly filteredRows = computed(() => {
    const list = this.rows();
    const ids = this.selectedFilterEmpIds();
    if (!ids.length) return list;
    const set = new Set(ids);
    return list.filter((r) => r.empId && set.has(r.empId));
  });

  readonly stats = computed(() => {
    const list = this.filteredRows();
    return {
      total: list.length,
      present: list.filter((r) => r.status === AttendanceStatus.NUMBER_1).length,
      absent: list.filter((r) => r.status === AttendanceStatus.NUMBER_2).length,
      late: list.filter((r) => r.status === AttendanceStatus.NUMBER_3).length,
    };
  });

  constructor() {
    this.employeePlansApi.employeePlansGetAllEmployees().pipe(map((r) => r.data ?? [])).subscribe({
      next: (list) => this.employees.set(list),
      error: () => this.employees.set([]),
    });

    effect(() => {
      this.workDate();
      this.reloadTick();
      const d = this.workDate();
      untracked(() => this.loadForDate(d));
    });
  }

  loadForDate(date: Date): void {
    this.loading.set(true);
    this.loadError.set(null);
    const dateStr = toYmdLocal(date);
    this.attendanceCalcApi.attendanceCalcGet(undefined, dateStr, dateStr).subscribe({
      next: (res) => {
        this.rows.set(res.data ?? []);
        this.loading.set(false);
        if (!res.success) this.loadError.set(res.message ?? 'تعذر تحميل النتائج');
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('تعذر الاتصال بالخادم');
      },
    });
  }

  runCalculation(): void {
    this.runningCalculation.set(true);
    const dateStr = toYmdLocal(this.workDate());
    const scope = this.calcScope();
    const filterIds = this.selectedFilterEmpIds();
    const cmd: RecalculateAttendanceCommand = {
      date: dateStr,
      employeeIds:
        scope === 'filtered' && filterIds.length > 0 ? filterIds : null,
    };
    this.attendanceCalcApi.attendanceCalcRecalculate(cmd).subscribe({
      next: (res) => {
        this.runningCalculation.set(false);
        if (res.success) this.loadForDate(this.workDate());
      },
      error: () => this.runningCalculation.set(false),
    });
  }

  getStatusLabel(status: number | undefined): string {
    if (status == null) return '—';
    return STATUS_LABELS[status] ?? String(status);
  }

  statusSeverity(status: number | undefined): 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'contrast' {
    if (status === AttendanceStatus.NUMBER_1) return 'success';
    if (status === AttendanceStatus.NUMBER_2) return 'danger';
    if (status === AttendanceStatus.NUMBER_3) return 'warning';
    return 'info';
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
