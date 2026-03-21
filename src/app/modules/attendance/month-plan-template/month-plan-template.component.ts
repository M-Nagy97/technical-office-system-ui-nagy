import { Component, OnInit, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
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
    TableModule,
    CardModule,
    TooltipModule,
    ToastModule,
    TagModule
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
    console.log('Loading plans...');
    this.plansApi.plansGetAll().pipe(map(res => {
      console.log('Plans record:', res);
      return res.data || [];
    })).subscribe(data => {
      console.log('Plans set:', data);
      this.plans.set(data);
    });
  }

  onPlanChange() {
    const planId = this.filterForm.value.planId;
    console.log('Plan changed:', planId);
    if (planId) {
      this.plansApi.plansGetShifts(planId).pipe(map(res => {
        console.log('Shifts record:', res);
        return res.data || [];
      })).subscribe(data => {
        console.log('Shifts set:', data);
        this.shifts.set(data);
      });
    }
  }

  generateDays() {
    console.log('Generating days...');
    if (this.filterForm.invalid) {
      console.log('Form invalid:', this.filterForm.errors);
      return;
    }

    const { year, month, planId } = this.filterForm.value;
    console.log('Parameters:', { year, month, planId });
    this.loading.set(true);
    // Fetch existing template - using direct http because it might not be in generated service yet
    // But I'll use the basePath from plansApi if possible, or just assume /api works if relative
    this.plansApi.plansGetTemplate(planId, year, month).subscribe({
      next: (res) => {
        console.log('Template record:', res);
        const existing = res.data as DaySchedule[] || [];
        const numDays = new Date(year, month, 0).getDate();
        console.log('Number of days:', numDays);
        const newDays: DaySchedule[] = [];

        for (let i = 1; i <= numDays; i++) {
          const date = new Date(year, month - 1, i);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const found = existing.find((d: any) => d.dayNumber === i);

          if (found) {

            newDays.push({ ...found, dayName });
          } else {
            const isWeekend = date.getDay() === 5 || date.getDay() === 6; // Fri/Sat? Adjust as needed
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
        console.log('Generated days:', newDays);
        this.days.set(newDays);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching template:', err);
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
