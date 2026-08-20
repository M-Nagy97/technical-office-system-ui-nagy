import { Component, OnInit, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';
import { SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { ApiResultOfIEnumerableOfDayScheduleDto, DayScheduleDto, PlansService, ShiftsService } from '../../../core/api/generated';
import { map } from 'rxjs/operators';

interface DaySchedule extends DayScheduleDto {
  dayNumber: number;
  dayName: string;
  shiftId: string | null;
  dayType: number;
  isHoliday: boolean;
  notes: string | null;

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
    ToastModule,
    TagModule,
    InputTextModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  providers: [MessageService],
  templateUrl: './month-plan-template.component.html',
  styleUrl: './month-plan-template.component.css'
})
export class MonthPlanTemplateComponent implements OnInit {
  plans = signal<any[]>([]);
  shifts = signal<any[]>([]);
  days = signal<DaySchedule[]>([]);

  filterForm: FormGroup;
  loading = signal(false);

  years = [2024, 2025, 2026];
  months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];

  dayTypes = [
    { label: 'Workday', value: 1 },
    { label: 'Weekend', value: 2 },
    { label: 'Holiday', value: 3 }
  ];

  readonly columns: SharedTableColumn<DaySchedule>[] = [
    { id: 'dayNumber', header: 'Day', valueGetter: (d) => d.dayNumber, align: 'center', cellClass: 'font-bold', width: '5rem' },
    { id: 'dayName', header: 'Name', align: 'center', width: '5rem' },
    { id: 'shiftId', header: 'Shift', align: 'start', width: '15rem' },
    { id: 'dayType', header: 'Type', align: 'start', width: '10rem' },
    { id: 'notes', header: 'Notes', align: 'start' },
  ];

  readonly rowClassForDay = (d: DaySchedule): string => {
    if (d.dayType === 2) return 'bg-blue-50';
    if (d.dayType === 3) return 'bg-yellow-50';
    return '';
  };

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private messageService: MessageService,
    private plansApi: PlansService,
    private shiftsApi: ShiftsService
  ) {
    const now = new Date();
    this.filterForm = this.fb.group({
      planId: [null, Validators.required],
      year: [now.getFullYear(), Validators.required],
      month: [now.getMonth() + 1, Validators.required]
    });
  }

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.plansApi.plansGetAll().pipe(map(res => res.data || [])).subscribe(data => {
      this.plans.set(data);
    });
  }

  onPlanChange() {
    const planId = this.filterForm.value.planId;
    if (planId) {
      this.plansApi.plansGetShifts(planId).pipe(map(res => res.data || [])).subscribe(data => {
        this.shifts.set(data);
      });
    }
  }

  generateDays() {
    if (this.filterForm.invalid) {
      return;
    }

    const { year, month, planId } = this.filterForm.value;
    this.loading.set(true);
    this.plansApi.plansGetTemplate(planId, year, month).subscribe({
      next: (res) => {
        const existing = res.data as DaySchedule[] || [];
        const numDays = new Date(year, month, 0).getDate();
        const newDays: DaySchedule[] = [];

        for (let i = 1; i <= numDays; i++) {
          const date = new Date(year, month - 1, i);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const found = existing.find((d: any) => d.dayNumber === i);

          if (found) {
            newDays.push({ ...found, dayName });
          } else {
            const isWeekend = date.getDay() === 5 || date.getDay() === 6;
            newDays.push({
              dayNumber: i,
              dayName,
              shiftId: isWeekend ? null : (this.shifts().length > 0 ? this.shifts()[0].id : null),
              dayType: isWeekend ? 2 : 1,
              isHoliday: false,
              notes: ''
            });
          }
        }
        this.days.set(newDays);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load template' });
        this.loading.set(false);
      }
    });
  }

  applyShiftToAll(shiftId: string) {
    const updated = this.days().map(d => {
      if (d.dayType === 1) { // Only workdays
        return { ...d, shiftId };
      }
      return d;
    });
    this.days.set(updated);
  }

  setWeekends() {
    const updated = this.days().map(d => {
      const isWeekend = d.dayName === 'Fri' || d.dayName === 'Sat';
      return {
        ...d,
        dayType: isWeekend ? 2 : d.dayType,
        shiftId: isWeekend ? null : d.shiftId
      };
    });
    this.days.set(updated);
  }

  saveTemplate() {
    if (this.filterForm.invalid) return;

    const { year, month, planId } = this.filterForm.value;
    const payload = {
      planId,
      year,
      month,
      days: this.days()
    };


    this.plansApi.plansUpsertTemplate(payload).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Template saved and synced to employees' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save template' });
      }
    });
  }
}
