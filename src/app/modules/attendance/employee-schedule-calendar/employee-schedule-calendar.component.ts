import { Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import arLocale from '@fullcalendar/core/locales/ar';
import { map, take } from 'rxjs/operators';
import {
  EmployeePlansService,
  EmployeeSchedulesService,
  EmployeeAttendanceStatusDto,
  EmployeeScheduleCalendarItemDto,
  DayType,
  ShiftsService,
  ShiftDto,
} from '../../../core/api/generated';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';
import { PermissionService } from '../../../core/auth/permission.service';
import { NotifyService } from '../../../shared';
import { TranslateModule } from '@ngx-translate/core';

type CalendarRow = EmployeeScheduleCalendarItemDto & { isCompanyHoliday?: boolean };

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysYmd(isoDate: string, days: number): string {
  const [y, mo, da] = isoDate.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  d.setDate(d.getDate() + days);
  return toYmdLocal(d);
}

function normalizeTime(t: string): string {
  if (!t) return '00:00:00';
  return t.length === 5 ? `${t}:00` : t;
}

@Component({
  selector: 'app-employee-schedule-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    DropdownModule,
    ProgressSpinnerModule,
    MessageModule,
    DialogModule,
    ButtonModule,
    FullCalendarModule,
    TranslateModule,
  ],
  templateUrl: './employee-schedule-calendar.component.html',
  styleUrl: './employee-schedule-calendar.component.scss',
})
export class EmployeeScheduleCalendarComponent implements OnInit {
  private readonly employeePlansApi = inject(EmployeePlansService);
  private readonly schedulesApi = inject(EmployeeSchedulesService);
  private readonly shiftsApi = inject(ShiftsService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly permission = inject(PermissionService);
  private readonly notify = inject(NotifyService);

  readonly fc = viewChild(FullCalendarComponent);

  employees: EmployeeAttendanceStatusDto[] = [];
  selectedEmployeeId: string | null = null;
  loadingEmployees = true;
  calendarError: string | null = null;
  rowsByDate = new Map<string, CalendarRow>();
  shifts: ShiftDto[] = [];
  dialogVisible = false;
  dialogDate = '';
  dialogRow: CalendarRow | null = null;
  dialogShiftId: string | null = null;
  dialogSaving = false;
  get canWrite(): boolean {
    return this.permission.canWriteModule('attendance');
  }

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    locale: arLocale,
    direction: 'rtl',
    firstDay: 6,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek',
    },
    buttonText: {
      today: 'اليوم',
      month: 'شهر',
      week: 'أسبوع',
    },
    height: 'auto',
    displayEventTime: true,
    eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: true, hour12: true },
    events: (info, successCallback, failureCallback) =>
      this.loadEventsForRange(info, successCallback, failureCallback),
    eventDidMount: (info) => this.decorateEventHover(info),
    dateClick: (info) => this.openDayDialog(info.dateStr?.slice(0, 10) ?? toYmdLocal(info.date)),
    eventClick: (info) => {
      const row = info.event.extendedProps['row'] as CalendarRow | undefined;
      const date = (row?.scheduleDate ?? info.event.startStr ?? '').slice(0, 10);
      if (date) this.openDayDialog(date);
    },
    datesSet: () => {
      this.calendarError = null;
    },
  };

  ngOnInit(): void {
    this.shiftsApi.shiftsGetAll().pipe(map((r) => r.data ?? [])).subscribe({
      next: (list) => (this.shifts = list),
      error: () => (this.shifts = []),
    });
    this.employeePlansApi.employeePlansGetAllEmployees().pipe(map((r) => r.data ?? [])).subscribe({
      next: (list) => {
        this.employees = list;
        this.loadingEmployees = false;
      },
      error: () => {
        this.loadingEmployees = false;
        this.calendarError = 'تعذر تحميل قائمة الموظفين';
      },
    });
  }

  onEmployeeChange(): void {
    this.calendarError = null;
    queueMicrotask(() => this.fc()?.getApi()?.refetchEvents());
  }

  private loadEventsForRange(
    info: { start: Date; end: Date; startStr: string; endStr: string },
    success: (events: EventInput[]) => void,
    failure: (err: Error) => void
  ): void {
    const empId = this.selectedEmployeeId;
    if (!empId) {
      success([]);
      return;
    }

    const from = toYmdLocal(info.start);
    const endExclusive = new Date(info.end);
    endExclusive.setDate(endExclusive.getDate() - 1);
    const to = toYmdLocal(endExclusive);

    this.schedulesApi
      .employeeSchedulesGetForRange(empId, from, to)
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          if (!res.success) {
            this.calendarError = res.message ?? 'تعذر تحميل الجدول';
            success([]);
            return;
          }
          const rows = (res.data ?? []) as CalendarRow[];
          this.rowsByDate = new Map(rows.filter((r) => r.scheduleDate).map((r) => [r.scheduleDate!.slice(0, 10), r]));
          success(this.mapRowsToEvents(rows));
        },
        error: () => {
          this.calendarError = 'تعذر تحميل جدول الموظف';
          failure(new Error('schedule fetch failed'));
        },
      });
  }

  private mapRowsToEvents(rows: EmployeeScheduleCalendarItemDto[]): EventInput[] {
    return rows.map((row) => {
      const colors = this.colorsForRow(row);
      const title = this.shortTitle(row);
      const date = row.scheduleDate ?? '';

      if (row.shiftStart && row.shiftEnd && date) {
        const start = `${date}T${normalizeTime(row.shiftStart)}`;
        const endDate = row.crossesMidnight ? addDaysYmd(date, 1) : date;
        const end = `${endDate}T${normalizeTime(row.shiftEnd)}`;
        return {
          id: row.id,
          title,
          start,
          end,
          allDay: false,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          extendedProps: { row },
        };
      }

      return {
        id: row.id,
        title,
        start: date,
        allDay: true,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        extendedProps: { row },
      };
    });
  }

  private shortTitle(row: EmployeeScheduleCalendarItemDto): string {
    const leave = row.leaveTypeArabicName || row.leaveTypeName;
    if (leave) {
      const prefix = row.isCompensatoryLeave ? 'بدل راحة' : 'إجازة';
      return row.shiftName ? `${row.shiftName} · ${prefix}: ${leave}` : `${prefix}: ${leave}`;
    }
    if (row.shiftName) return row.shiftName;
    if (row.isHoliday) return 'عطلة';
    return this.dayTypeLabel(row.dayType);
  }

  private dayTypeLabel(dt?: DayType): string {
    switch (dt) {
      case DayType.NUMBER_1:
        return 'يوم عمل';
      case DayType.NUMBER_2:
        return 'عطلة أسبوعية';
      case DayType.NUMBER_3:
        return 'عطلة رسمية';
      case DayType.NUMBER_4:
        return 'يوم تعويضي';
      default:
        return '—';
    }
  }

  sourceLabel(row: CalendarRow | null): string {
    if (row?.isEmployeeOverride) return 'تجاوز لهذا الموظف';
    if (row?.isCompanyHoliday) return 'عطلة رسمية للشركة';
    return 'من الخطة';
  }

  openDayDialog(date: string): void {
    if (!this.selectedEmployeeId || !date) return;
    this.dialogDate = date;
    this.dialogRow = this.rowsByDate.get(date) ?? null;
    this.dialogShiftId = this.dialogRow?.shiftId ?? this.shifts[0]?.id ?? null;
    this.dialogVisible = true;
  }

  markPersonalHoliday(): void {
    this.saveOverride(3, true, null, this.dialogRow?.notes ?? 'عطلة شخصية');
  }

  markWorkday(): void {
    const shiftId = this.dialogRow?.shiftId || this.dialogShiftId;
    if (!shiftId) {
      this.notify.warn('employee_schedule_page.pick_shift');
      return;
    }
    this.saveOverride(1, false, shiftId, this.dialogRow?.notes ?? null);
  }

  clearOverride(): void {
    const empId = this.selectedEmployeeId;
    if (!empId || !this.dialogDate) return;
    this.dialogSaving = true;
    this.attendanceApi.deleteEmployeeScheduleOverride(empId, this.dialogDate).subscribe({
      next: () => {
        this.dialogSaving = false;
        this.dialogVisible = false;
        this.notify.success('employee_schedule_page.cleared');
        this.fc()?.getApi()?.refetchEvents();
      },
      error: (err: unknown) => {
        this.dialogSaving = false;
        this.notify.error(err, 'employee_schedule_page.save_failed');
      },
    });
  }

  private saveOverride(dayType: number, isHoliday: boolean, shiftId: string | null, notes: string | null): void {
    const empId = this.selectedEmployeeId;
    if (!empId || !this.dialogDate) return;
    this.dialogSaving = true;
    this.attendanceApi
      .upsertEmployeeSchedule(empId, this.dialogDate, { dayType, isHoliday, shiftId, notes })
      .subscribe({
        next: () => {
          this.dialogSaving = false;
          this.dialogVisible = false;
          this.notify.success('employee_schedule_page.saved');
          this.fc()?.getApi()?.refetchEvents();
        },
        error: (err: unknown) => {
          this.dialogSaving = false;
          this.notify.error(err, 'employee_schedule_page.save_failed');
        },
      });
  }

  private colorsForRow(row: CalendarRow): { bg: string; border: string } {
    if (row.isEmployeeOverride && (row.isHoliday || row.dayType === DayType.NUMBER_3))
      return { bg: '#fdba74', border: '#c2410c' };
    if (row.isHoliday || row.dayType === DayType.NUMBER_3)
      return { bg: '#fecaca', border: '#dc2626' };
    if (row.dayType === DayType.NUMBER_2) return { bg: '#e2e8f0', border: '#64748b' };
    if (row.isCompensatoryLeave) return { bg: '#ddd6fe', border: '#7c3aed' };
    if (row.leaveTypeName || row.leaveTypeArabicName) return { bg: '#fde68a', border: '#d97706' };
    if (row.shiftId) return { bg: '#a7f3d0', border: '#10b981' };
    return { bg: '#99f6e4', border: '#0d9488' };
  }

  private decorateEventHover(info: EventMountArg): void {
    const row = info.event.extendedProps['row'] as EmployeeScheduleCalendarItemDto | undefined;
    if (!row) return;
    const text = this.buildTooltipText(row);
    info.el.setAttribute('title', text);
    info.el.setAttribute('aria-label', text);
  }

  private buildTooltipText(row: EmployeeScheduleCalendarItemDto): string {
    const lines: string[] = [];
    lines.push(`الخطة: ${row.planName ?? '—'}`);
    lines.push(`التاريخ: ${row.scheduleDate ?? '—'}`);
    lines.push(`نوع اليوم: ${this.dayTypeLabel(row.dayType)}`);
    lines.push(`المصدر: ${this.sourceLabel(row)}`);
    if (row.isHoliday) lines.push('تعطيل: نعم');
    if (row.shiftName) {
      lines.push(`الوردية: ${row.shiftName}`);
      if (row.shiftCode) lines.push(`الرمز: ${row.shiftCode}`);
      if (row.shiftStart && row.shiftEnd) {
        lines.push(`من ${row.shiftStart} إلى ${row.shiftEnd}`);
        if (row.crossesMidnight) lines.push('(عبر منتصف الليل)');
      }
      if (row.graceInMinutes != null) lines.push(`سماحية دخول: ${row.graceInMinutes} د`);
      if (row.graceOutMinutes != null) lines.push(`سماحية خروج: ${row.graceOutMinutes} د`);
      if (row.fingerInFrom && row.fingerInTo) lines.push(`بصمة دخول: ${row.fingerInFrom} – ${row.fingerInTo}`);
      if (row.fingerOutFrom && row.fingerOutTo) lines.push(`بصمة خروج: ${row.fingerOutFrom} – ${row.fingerOutTo}`);
      if (row.minWorkHoursRequired != null) lines.push(`حد أدنى ساعات عمل: ${row.minWorkHoursRequired}`);
    } else {
      lines.push('لا توجد وردية محددة لهذا اليوم');
    }
    if (row.notes) lines.push(`ملاحظات: ${row.notes}`);
    const leaveName = row.leaveTypeArabicName || row.leaveTypeName;
    if (leaveName) {
      const kind = row.isCompensatoryLeave ? 'بدل راحة' : 'إجازة';
      const from = row.leaveStartDate ?? '';
      const to = row.leaveEndDate ?? '';
      lines.push(`${kind}: ${leaveName}${from && to ? ` (${from} – ${to})` : ''}`);
    }
    for (const p of row.permissions ?? []) {
      const name = p.permissionTypeArabicName || p.permissionTypeName || 'إذن';
      if (p.kind === 1) {
        lines.push(`${name} - ${p.isMorning ? 'صباحي' : 'مسائي'}`);
      } else {
        const from = (p.fromTime ?? '').slice(0, 5);
        const to = (p.toTime ?? '').slice(0, 5);
        lines.push(from && to ? `${name} ${from} - ${to}` : name);
      }
    }
    return lines.join('\n');
  }
}
