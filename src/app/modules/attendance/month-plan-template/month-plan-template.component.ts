import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';
import { SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import {
  DayType,
  PlanListItemDto,
  PlanScheduleDto,
  PlanSchedulesService,
  PlansService,
  ShiftDto,
} from '../../../core/api/generated';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AttendanceApiService } from '../../../core/services/attendance-api.service';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
const DAY_WORKDAY = 1;
const DAY_WEEKEND = 2;
const DAY_HOLIDAY = 3;

export type PlannerViewMode = 'month' | 'week';

export interface PlannerDay {
  id: string;
  planId: string;
  scheduleDate: string;
  date: Date;
  dayNumber: number;
  weekday: number;
  shiftId: string | null;
  dayType: number;
  isHoliday: boolean;
  notes: string | null;
  isCompanyHoliday: boolean;
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string | undefined | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfWeekSunday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

@Component({
  selector: 'app-month-plan-template',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DropdownModule,
    CalendarModule,
    ButtonModule,
    CardModule,
    TooltipModule,
    TagModule,
    InputTextModule,
    CheckboxModule,
    DialogModule,
    TranslateModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    HasPermissionDirective,
  ],
  templateUrl: './month-plan-template.component.html',
  styleUrl: './month-plan-template.component.css',
})
export class MonthPlanTemplateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly plansApi = inject(PlansService);
  private readonly planSchedulesApi = inject(PlanSchedulesService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly translate = inject(TranslateService);

  readonly plans = signal<PlanListItemDto[]>([]);
  readonly shifts = signal<ShiftDto[]>([]);
  readonly days = signal<PlannerDay[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly viewMode = signal<PlannerViewMode>('month');
  readonly weekStart = signal(startOfWeekSunday(new Date()));
  readonly offWeekdays = signal<number[]>([5, 6]);
  readonly defaultShiftId = signal<string | null>(null);

  readonly showHolidayDialog = signal(false);
  readonly holidayDate = signal<Date | null>(null);
  readonly holidayName = signal('');

  filterForm: FormGroup;

  readonly years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i);

  readonly weekdayOptions = [0, 1, 2, 3, 4, 5, 6];

  readonly stats = computed(() => {
    const days = this.days();
    return {
      total: days.length,
      workdays: days.filter((d) => d.dayType === DAY_WORKDAY).length,
      weekends: days.filter((d) => d.dayType === DAY_WEEKEND).length,
      holidays: days.filter((d) => d.dayType === DAY_HOLIDAY || d.isHoliday).length,
    };
  });

  readonly weekRangeLabel = computed(() => {
    const start = this.weekStart();
    const end = addDays(start, 6);
    const locale = this.translate.currentLang === 'ar' ? 'ar-EG' : undefined;
    return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })} – ${end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  });

  readonly monthOptions = computed(() =>
    Array.from({ length: 12 }, (_, i) => ({
      label: this.translate.instant(`month_plan_template_page.month_${i + 1}`),
      value: i + 1,
    }))
  );

  readonly dayTypes = computed(() => [
    { label: this.translate.instant('month_plan_template_page.type_workday'), value: DAY_WORKDAY },
    { label: this.translate.instant('month_plan_template_page.type_weekend'), value: DAY_WEEKEND },
    { label: this.translate.instant('month_plan_template_page.type_holiday'), value: DAY_HOLIDAY },
  ]);

  readonly columns: SharedTableColumn<PlannerDay>[] = [
    {
      id: 'dayNumber',
      header: 'month_plan_template_page.col_day',
      valueGetter: (d) => d.dayNumber,
      align: 'center',
      cellClass: 'font-bold',
      width: '5rem',
    },
    { id: 'dayName', header: 'month_plan_template_page.col_name', align: 'center', width: '8rem' },
    { id: 'shiftId', header: 'month_plan_template_page.col_shift', align: 'start', width: '15rem' },
    { id: 'dayType', header: 'month_plan_template_page.col_type', align: 'start', width: '12rem' },
    { id: 'badge', header: 'month_plan_template_page.col_badge', align: 'start', width: '14rem' },
    { id: 'notes', header: 'month_plan_template_page.col_notes', align: 'start' },
  ];

  readonly rowClassForDay = (d: PlannerDay): string => {
    if (d.isCompanyHoliday || d.dayType === DAY_HOLIDAY || d.isHoliday) return 'row-holiday';
    if (d.dayType === DAY_WEEKEND) return 'row-weekend';
    return 'row-workday';
  };

  constructor() {
    const now = new Date();
    this.filterForm = this.fb.group({
      planId: [null, Validators.required],
      year: [now.getFullYear(), Validators.required],
      month: [now.getMonth() + 1, Validators.required],
    });
  }

  ngOnInit(): void {
    this.plansApi
      .plansGetAll()
      .pipe(map((res) => res.data || []))
      .subscribe({
        next: (data) => this.plans.set(data),
        error: () => this.toastError('month_plan_template_page.load_failed'),
      });
  }

  weekdayLabel(weekday: number): string {
    return this.translate.instant(`month_plan_template_page.weekday_${weekday}`);
  }

  shiftName(shiftId: string | null): string {
    if (!shiftId) return this.translate.instant('month_plan_template_page.no_shift');
    return this.shifts().find((s) => s.id === shiftId)?.shiftName ?? this.translate.instant('month_plan_template_page.no_shift');
  }

  isOffSelected(day: number): boolean {
    return this.offWeekdays().includes(day);
  }

  toggleOffDay(day: number, checked: boolean): void {
    const current = this.offWeekdays();
    if (checked) {
      if (current.includes(day)) return;
      if (current.length >= 2) {
        this.offWeekdays.set([current[1], day]);
        return;
      }
      this.offWeekdays.set([...current, day]);
      return;
    }
    this.offWeekdays.set(current.filter((d) => d !== day));
  }

  setViewMode(mode: PlannerViewMode): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    if (this.filterForm.value.planId) this.loadDays();
  }

  prevPeriod(): void {
    if (this.viewMode() === 'week') {
      this.weekStart.set(addDays(this.weekStart(), -7));
    } else {
      this.shiftMonth(-1);
    }
    if (this.filterForm.value.planId) this.loadDays();
  }

  nextPeriod(): void {
    if (this.viewMode() === 'week') {
      this.weekStart.set(addDays(this.weekStart(), 7));
    } else {
      this.shiftMonth(1);
    }
    if (this.filterForm.value.planId) this.loadDays();
  }

  onPlanChange(): void {
    const planId = this.filterForm.value.planId as string | null;
    this.days.set([]);
    this.shifts.set([]);
    this.defaultShiftId.set(null);
    if (!planId) return;
    this.plansApi
      .plansGetShifts(planId)
      .pipe(map((res) => res.data || []))
      .subscribe({
        next: (data) => {
          this.shifts.set(data);
          this.defaultShiftId.set(data[0]?.id ?? null);
          this.loadDays();
        },
        error: () => this.toastError('month_plan_template_page.load_failed'),
      });
  }

  loadDays(): void {
    if (this.filterForm.invalid) return;
    const planId = this.filterForm.value.planId as string;
    const { from, to, dates } = this.visibleRange();
    this.loading.set(true);
    forkJoin({
      schedules: this.planSchedulesApi.planSchedulesGet(planId, toYmdLocal(from), toYmdLocal(to)),
      holidays: this.attendanceApi.getPublicHolidays({ from: toYmdLocal(from), to: toYmdLocal(to) }).pipe(
        catchError(() => of([]))
      ),
    }).subscribe({
      next: ({ schedules, holidays }) => {
        const existing = schedules.data ?? [];
        const byDate = new Map<string, PlanScheduleDto>();
        for (const row of existing) {
          const key = (row.scheduleDate ?? '').slice(0, 10);
          if (key) byDate.set(key, row);
        }
        const companyByDate = new Map<string, string>();
        for (const h of holidays) {
          const start = parseYmd(h.fromDate);
          const end = parseYmd(h.toDate);
          if (!start || !end) continue;
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            companyByDate.set(toYmdLocal(d), h.name);
          }
        }
        const fallbackShift = this.defaultShiftId() ?? this.shifts()[0]?.id ?? null;
        const off = new Set(this.offWeekdays());
        const next: PlannerDay[] = dates.map((date) => {
          const ymd = toYmdLocal(date);
          const found = byDate.get(ymd);
          const weekday = date.getDay();
          const companyName = companyByDate.get(ymd);
          if (companyName) {
            return {
              id: found?.id ?? EMPTY_GUID,
              planId,
              scheduleDate: ymd,
              date,
              dayNumber: date.getDate(),
              weekday,
              shiftId: null,
              dayType: DAY_HOLIDAY,
              isHoliday: true,
              notes: companyName,
              isCompanyHoliday: true,
            };
          }
          if (found) {
            return {
              id: found.id ?? EMPTY_GUID,
              planId,
              scheduleDate: ymd,
              date,
              dayNumber: date.getDate(),
              weekday,
              shiftId: found.shiftId ?? null,
              dayType: found.dayType ?? (off.has(weekday) ? DAY_WEEKEND : DAY_WORKDAY),
              isHoliday: !!found.isHoliday || found.dayType === DayType.NUMBER_3,
              notes: found.notes ?? '',
              isCompanyHoliday: false,
            };
          }
          const isOff = off.has(weekday);
          return {
            id: EMPTY_GUID,
            planId,
            scheduleDate: ymd,
            date,
            dayNumber: date.getDate(),
            weekday,
            shiftId: isOff ? null : fallbackShift,
            dayType: isOff ? DAY_WEEKEND : DAY_WORKDAY,
            isHoliday: false,
            notes: '',
            isCompanyHoliday: false,
          };
        });
        this.days.set(next);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastError('month_plan_template_page.load_failed');
      },
    });
  }

  onDayTypeChange(row: PlannerDay): void {
    if (row.isCompanyHoliday) return;
    if (row.dayType !== DAY_WORKDAY) row.shiftId = null;
    row.isHoliday = row.dayType === DAY_HOLIDAY;
    if (row.dayType === DAY_WORKDAY && !row.shiftId) {
      row.shiftId = this.defaultShiftId() ?? this.shifts()[0]?.id ?? null;
    }
    this.days.set([...this.days()]);
  }

  applyWeeklyOffDays(): void {
    const off = this.offWeekdays();
    if (off.length !== 2) {
      this.toastWarn('month_plan_template_page.pick_two_off_days');
      return;
    }
    const shiftId = this.defaultShiftId() ?? this.shifts()[0]?.id ?? null;
    if (!shiftId) {
      this.toastWarn('month_plan_template_page.pick_shift');
      return;
    }
    const offSet = new Set(off);
    this.days.set(
      this.days().map((d) => {
        if (d.isCompanyHoliday || d.dayType === DAY_HOLIDAY || d.isHoliday) return d;
        const isOff = offSet.has(d.weekday);
        return {
          ...d,
          dayType: isOff ? DAY_WEEKEND : DAY_WORKDAY,
          isHoliday: false,
          shiftId: isOff ? null : shiftId,
        };
      })
    );
  }

  applyShiftToWorkdays(): void {
    const shiftId = this.defaultShiftId() ?? this.shifts()[0]?.id ?? null;
    if (!shiftId) {
      this.toastWarn('month_plan_template_page.pick_shift');
      return;
    }
    this.days.set(
      this.days().map((d) => (d.dayType === DAY_WORKDAY && !d.isCompanyHoliday ? { ...d, shiftId } : d))
    );
  }

  openHolidayDialog(): void {
    this.holidayDate.set(this.days()[0]?.date ?? new Date());
    this.holidayName.set('');
    this.showHolidayDialog.set(true);
  }

  saveHoliday(): void {
    const date = this.holidayDate();
    const name = this.holidayName().trim();
    if (!date) return;
    if (!name) {
      this.toastWarn('month_plan_template_page.holiday_name_required');
      return;
    }
    const ymd = toYmdLocal(date);
    const match = this.days().find((d) => d.scheduleDate === ymd);
    if (!match) {
      this.toastWarn('month_plan_template_page.holiday_not_in_period');
      return;
    }
    if (match.isCompanyHoliday) {
      this.toastWarn('month_plan_template_page.company_holiday_locked');
      return;
    }
    this.days.set(
      this.days().map((d) =>
        d.scheduleDate === ymd
          ? { ...d, dayType: DAY_HOLIDAY, isHoliday: true, shiftId: null, notes: name, isCompanyHoliday: false }
          : d
      )
    );
    this.showHolidayDialog.set(false);
  }

  savePlan(): void {
    if (this.filterForm.invalid || !this.days().length) return;
    const planId = this.filterForm.value.planId as string;
    const missingShift = this.days().some((d) => !d.isCompanyHoliday && d.dayType === DAY_WORKDAY && !d.shiftId);
    if (missingShift) {
      this.toastWarn('month_plan_template_page.workday_needs_shift');
      return;
    }
    const schedules: PlanScheduleDto[] = this.days()
      .filter((d) => !d.isCompanyHoliday)
      .map((d) => ({
      id: d.id || EMPTY_GUID,
      planId,
      scheduleDate: d.scheduleDate,
      shiftId: d.dayType === DAY_WORKDAY ? d.shiftId : null,
      dayType: d.dayType as DayType,
      isHoliday: d.dayType === DAY_HOLIDAY,
      notes: d.notes,
    }));
    this.saving.set(true);
    this.planSchedulesApi.planSchedulesBulkUpsert({ planId, schedules }).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (!res.success) {
          this.toastError('month_plan_template_page.save_failed', res.message);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success') || 'OK',
          detail: this.translate.instant('month_plan_template_page.saved'),
        });
        this.loadDays();
      },
      error: () => {
        this.saving.set(false);
        this.toastError('month_plan_template_page.save_failed');
      },
    });
  }

  private visibleRange(): { from: Date; to: Date; dates: Date[] } {
    if (this.viewMode() === 'week') {
      const from = this.weekStart();
      const to = addDays(from, 6);
      const dates = Array.from({ length: 7 }, (_, i) => addDays(from, i));
      return { from, to, dates };
    }
    const year = this.filterForm.value.year as number;
    const month = this.filterForm.value.month as number;
    const from = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0).getDate();
    const to = new Date(year, month - 1, last);
    const dates = Array.from({ length: last }, (_, i) => new Date(year, month - 1, i + 1));
    return { from, to, dates };
  }

  private shiftMonth(delta: number): void {
    const year = this.filterForm.value.year as number;
    const month = this.filterForm.value.month as number;
    const d = new Date(year, month - 1 + delta, 1);
    this.filterForm.patchValue({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  private toastError(key: string, detail?: string | null): void {
    this.messageService.add({
      severity: 'error',
      summary: this.translate.instant('common.error') || 'Error',
      detail: detail || this.translate.instant(key),
    });
  }

  private toastWarn(key: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.instant('common.warning') || 'Warning',
      detail: this.translate.instant(key),
    });
  }
}
