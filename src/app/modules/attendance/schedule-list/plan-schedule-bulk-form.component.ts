import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { map } from 'rxjs/operators';
import { FormActionsComponent, FormFieldComponent, NotifyService } from '../../../shared';
import {
  PlanSchedulesService,
  ShiftsService,
  ShiftDto,
  BulkUpsertPlanSchedulesCommand,
  DayType,
} from '../../../core/api/generated';

@Component({
  selector: 'app-plan-schedule-bulk-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    CardModule,
    CalendarModule,
    DropdownModule,
    InputTextareaModule,
    FormFieldComponent,
    FormActionsComponent,
  ],
  templateUrl: './plan-schedule-bulk-form.component.html',
  styleUrl: './plan-schedule-bulk-form.component.scss',
})
export class PlanScheduleBulkFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly schedulesApi = inject(PlanSchedulesService);
  private readonly shiftsApi = inject(ShiftsService);
  private readonly notify = inject(NotifyService);

  readonly planId = signal<string | null>(null);
  readonly shifts = signal<ShiftDto[]>([]);
  readonly saving = signal(false);
  form!: FormGroup;

  private toYmdLocal(value: Date): string {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  ngOnInit(): void {
    const pId = this.route.snapshot.paramMap.get('id');
    if (pId) {
      this.planId.set(pId);
    } else {
      this.notify.error(null, 'bulk_schedule.missing_plan');
      this.router.navigate(['/attendance/plans']);
      return;
    }

    this.form = this.fb.group({
      planId: [pId, Validators.required],
      startDate: [new Date(), Validators.required],
      endDate: [new Date(), Validators.required],
      shiftId: [null, Validators.required],
      notes: [''],
    });

    this.loadShifts();
  }

  loadShifts(): void {
    this.shiftsApi.shiftsGetAll().pipe(map((res) => res.data ?? [])).subscribe({
      next: (list) => this.shifts.set(list),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const v = this.form.value;
    
    const schedules: any[] = [];
    const start = new Date(v.startDate);
    const end = new Date(v.endDate);

    if (start > end) {
      this.saving.set(false);
      this.notify.warn('bulk_schedule.date_order');
      return;
    }

    for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      schedules.push({
        planId: v.planId,
        shiftId: v.shiftId,
        scheduleDate: this.toYmdLocal(d),
        dayType: DayType.NUMBER_1,
        isHoliday: false,
        notes: v.notes
      });
    }

    const cmd: BulkUpsertPlanSchedulesCommand = {
      planId: v.planId,
      schedules: schedules
    };

    this.schedulesApi.planSchedulesBulkUpsert(cmd).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.notify.success('bulk_schedule.save_success');
          this.router.navigate(['/attendance/plans', this.planId(), 'schedules']);
        } else {
          if (res.message) {
            this.notify.errorText(res.message);
          } else {
            this.notify.error(null, 'common.save_error');
          }
        }
      },
        error: (error) => {
          this.saving.set(false);
          this.notify.error(error, 'common.save_error');
        },
    });
  }
}
