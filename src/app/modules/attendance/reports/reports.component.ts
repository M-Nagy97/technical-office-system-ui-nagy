import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { RippleModule } from 'primeng/ripple';
import { EmployeeService } from '../../../core/services/employee.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { AttendanceSummary } from '../../../core/models/attendance.model';
import { AttendanceRecord } from '../../../core/models/attendance.model';

@Component({
  selector: 'app-attendance-reports',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    RippleModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly attendanceService = inject(AttendanceService);

  readonly selectedMonth = signal(new Date().getMonth());
  readonly selectedYear = signal(new Date().getFullYear());
  readonly selectedEmployeeId = signal<string | null>(null);
  readonly employeeForCalendar = signal<string | null>(null);

  readonly employees = signal<{ id: string; fullName: string }[]>([]);
  readonly summaries = signal<AttendanceSummary[]>([]);
  readonly calendarRecords = signal<AttendanceRecord[]>([]);

  readonly chartBars = computed(() => {
    const s = this.summaries();
    return s.map((x) => {
      const total = x.presentDays + x.absentDays + x.lateDays || 1;
      return {
        name: x.employeeName,
        present: x.presentDays,
        absent: x.absentDays,
        late: x.lateDays,
        total,
      };
    });
  });

  readonly monthOptions = [
    { label: 'يناير', value: 0 }, { label: 'فبراير', value: 1 }, { label: 'مارس', value: 2 },
    { label: 'أبريل', value: 3 }, { label: 'مايو', value: 4 }, { label: 'يونيو', value: 5 },
    { label: 'يوليو', value: 6 }, { label: 'أغسطس', value: 7 }, { label: 'سبتمبر', value: 8 },
    { label: 'أكتوبر', value: 9 }, { label: 'نوفمبر', value: 10 }, { label: 'ديسمبر', value: 11 },
  ];

  readonly yearOptions: { label: string; value: number }[] = [];

  readonly employeeDropdownOptions = computed(() => [
    { label: 'الكل', value: null as string | null },
    ...this.employees().map((e) => ({ label: e.fullName, value: e.id })),
  ]);

  readonly filteredSummaries = computed(() => {
    const list = this.summaries();
    const eid = this.selectedEmployeeId();
    if (!eid) return list;
    return list.filter((s) => s.employeeId === eid);
  });

  readonly calendarDates = computed(() => {
    const recs = this.calendarRecords();
    const byDate = new Map<string, string>();
    for (const r of recs) {
      const key = new Date(r.date).toISOString().slice(0, 10);
      byDate.set(key, r.status);
    }
    return byDate;
  });

  ngOnInit(): void {
    const y = new Date().getFullYear();
    for (let i = y; i >= y - 5; i--) this.yearOptions.push({ label: String(i), value: i });
    this.employees.set(
      this.employeeService.getList().map((e) => ({ id: e.id, fullName: e.fullName }))
    );
    this.refresh();
  }

  refresh(): void {
    const month = this.selectedMonth();
    const year = this.selectedYear();
    const sum = this.attendanceService.getSummaries(month, year, this.selectedEmployeeId() ?? undefined);
    this.summaries.set(sum);
    const eid = this.employeeForCalendar();
    if (eid) {
      this.calendarRecords.set(
        this.attendanceService.getRecordsForEmployeeMonth(eid, month, year)
      );
    } else {
      this.calendarRecords.set([]);
    }
  }

  onMonthChange(): void {
    this.refresh();
  }

  onYearChange(): void {
    this.refresh();
  }

  onEmployeeFilterChange(): void {
    this.refresh();
  }

  showCalendarFor(employeeId: string): void {
    this.employeeForCalendar.set(employeeId);
    this.refresh();
  }

  exportExcel(): void {
    const sum = this.filteredSummaries();
    const headers = ['الموظف', 'الشهر', 'السنة', 'أيام الحضور', 'أيام الغياب', 'أيام التأخير', 'إجازة', 'مجموع دقائق التأخير'];
    const rows = sum.map((s) => [
      s.employeeName,
      s.month + 1,
      s.year,
      s.presentDays,
      s.absentDays,
      s.lateDays,
      s.vacationDays,
      s.totalLateMinutes,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${this.selectedYear()}-${this.selectedMonth() + 1}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

}
