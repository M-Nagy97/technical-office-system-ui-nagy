import { Component, OnInit, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, EventMountArg, DatesSetArg } from '@fullcalendar/core';
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
} from '../../../core/api/generated';

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
    FullCalendarModule,
  ],
  templateUrl: './employee-schedule-calendar.component.html',
  styleUrl: './employee-schedule-calendar.component.scss',
})
export class EmployeeScheduleCalendarComponent implements OnInit {
  private readonly employeePlansApi = inject(EmployeePlansService);
  private readonly schedulesApi = inject(EmployeeSchedulesService);

  readonly fc = viewChild(FullCalendarComponent);

  employees: EmployeeAttendanceStatusDto[] = [];
  selectedEmployeeId: string | null = null;
  loadingEmployees = true;
  calendarError: string | null = null;

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
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false },
    events: (info, successCallback, failureCallback) =>
      this.loadEventsForRange(info, successCallback, failureCallback),
    eventDidMount: (info) => this.decorateEventHover(info),
    datesSet: () => {
      this.calendarError = null;
    },
  };

  ngOnInit(): void {
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
          success(this.mapRowsToEvents(res.data ?? []));
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

  private colorsForRow(row: EmployeeScheduleCalendarItemDto): { bg: string; border: string } {
    if (row.isHoliday || row.dayType === DayType.NUMBER_3)
      return { bg: '#fecaca', border: '#dc2626' };
    if (row.dayType === DayType.NUMBER_2) return { bg: '#e2e8f0', border: '#64748b' };
    if (row.shiftId) return { bg: '#bfdbfe', border: '#2563eb' };
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
    return lines.join('\n');
  }
}
