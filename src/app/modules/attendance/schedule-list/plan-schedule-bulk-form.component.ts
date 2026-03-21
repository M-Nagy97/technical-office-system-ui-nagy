import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessageModule } from 'primeng/message';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { map } from 'rxjs/operators';
import {
  PlanSchedulesService,
  ShiftsService,
  ShiftDto,
  BulkUpsertPlanSchedulesCommand,
} from '../../../core/api/generated';

@Component({
  selector: 'app-plan-schedule-bulk-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    CalendarModule,
    DropdownModule,
    InputTextareaModule,
    MessageModule,
    RippleModule,
    InputTextModule,
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
  private readonly messageService = inject(MessageService);

  readonly planId = signal<string | null>(null);
  readonly shifts = signal<ShiftDto[]>([]);
  readonly saving = signal(false);
  form!: FormGroup;

  ngOnInit(): void {
    const pId = this.route.snapshot.paramMap.get('id');
    if (pId) {
      this.planId.set(pId);
    } else {
      this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'رقم الخطة غير موجود' });
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
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      schedules.push({
        planId: v.planId,
        shiftId: v.shiftId,
        scheduleDate: d.toISOString().split('T')[0],
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
          this.messageService.add({
            severity: 'success',
            summary: 'تم',
            detail: 'تم تحديث الجدول بنجاح',
          });
          this.router.navigate(['/attendance/plans', this.planId(), 'schedules']);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: res.message ?? 'فشل التحديث',
          });
        }
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء التحديث',
        });
      },
    });
  }
}
