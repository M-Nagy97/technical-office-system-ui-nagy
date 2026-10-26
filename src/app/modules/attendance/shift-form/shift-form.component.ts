import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { map } from 'rxjs/operators';
import {
  ShiftsService,
  CreateShiftCommand,
  UpdateShiftCommand,
} from '../../../core/api/generated';
import { FormActionsComponent, FormFieldComponent, FormSectionComponent, NotifyService } from '../../../shared';

function timeToApi(v: string): string {
  if (!v || v.length < 5) return '00:00:00';
  return v.length === 5 ? `${v}:00` : v;
}

@Component({
  selector: 'app-shift-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    CardModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    FormFieldComponent,
    FormSectionComponent,
    FormActionsComponent,
  ],
  templateUrl: './shift-form.component.html',
  styleUrl: './shift-form.component.scss',
})
export class ShiftFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shiftsService = inject(ShiftsService);
  private readonly notify = inject(NotifyService);

  readonly isEdit = signal(false);
  readonly id = signal<string | null>(null);
  readonly saving = signal(false);
  form!: FormGroup;


  ngOnInit(): void {
    this.form = this.fb.group({
      shiftCode: ['', [Validators.required, Validators.maxLength(50)]],
      shiftName: ['', [Validators.required, Validators.maxLength(200)]],
      isActive: [true],
      shiftStart: ['08:00', Validators.required],
      shiftEnd: ['16:00', Validators.required],
      fingerInFrom: ['07:00', Validators.required],
      fingerInTo: ['09:00', Validators.required],
      fingerOutFrom: ['15:30', Validators.required],
      fingerOutTo: ['18:00', Validators.required],
      graceInMinutes: [15, [Validators.required, Validators.min(0)]],
      graceOutMinutes: [15, [Validators.required, Validators.min(0)]],
      allowOvertimeBefore: [false],
      allowOvertimeAfter: [false],
      maxOvertimeBeforeMin: [0],
      maxOvertimeAfterMin: [0],
      minWorkHoursRequired: [8, [Validators.required, Validators.min(0)]],
    });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId && routeId !== 'new') {
      this.id.set(routeId);
      this.isEdit.set(true);
      this.form.get('shiftCode')?.clearValidators();
      this.form.get('shiftCode')?.updateValueAndValidity();
      this.shiftsService.shiftsGetById(routeId).pipe(map((r) => r.data)).subscribe({
        next: (d) => {
          if (d) {
            const toTime = (s: string | undefined) => (s ? s.substring(0, 5) : '00:00');
            this.form.patchValue({
              shiftCode: d.shiftCode ?? '',
              shiftName: d.shiftName ?? '',
              isActive: d.isActive ?? true,
              shiftStart: toTime(d.shiftStart),
              shiftEnd: toTime(d.shiftEnd),
              fingerInFrom: toTime(d.fingerInFrom),
              fingerInTo: toTime(d.fingerInTo),
              fingerOutFrom: toTime(d.fingerOutFrom),
              fingerOutTo: toTime(d.fingerOutTo),
              graceInMinutes: d.graceInMinutes ?? 0,
              graceOutMinutes: d.graceOutMinutes ?? 0,
              allowOvertimeBefore: d.allowOvertimeBefore ?? false,
              allowOvertimeAfter: d.allowOvertimeAfter ?? false,
              maxOvertimeBeforeMin: d.maxOvertimeBeforeMin ?? 0,
              maxOvertimeAfterMin: d.maxOvertimeAfterMin ?? 0,
              minWorkHoursRequired: d.minWorkHoursRequired ?? 0,
            });
          }
        },
        error: (error) => {
          this.notify.error(error, 'common.load_error');
        },
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const id = this.id();
    const isEdit = this.isEdit();
    this.saving.set(true);

    const v = this.form.value;
    if (isEdit && id) {
      const cmd: UpdateShiftCommand = {
        id,
        ...v,
        shiftStart: timeToApi(v.shiftStart),
        shiftEnd: timeToApi(v.shiftEnd),
        fingerInFrom: timeToApi(v.fingerInFrom),
        fingerInTo: timeToApi(v.fingerInTo),
        fingerOutFrom: timeToApi(v.fingerOutFrom),
        fingerOutTo: timeToApi(v.fingerOutTo),
      };
      this.shiftsService.shiftsUpdate(id, cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.notify.success('common.update_success');
            this.router.navigate(['/attendance/shifts']);
          } else if (res.message) {
            this.notify.errorText(res.message);
          } else {
            this.notify.error(null, 'common.save_error');
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.notify.error(error, 'common.save_error');
        },
      });
    } else {
      const cmd: CreateShiftCommand = {
        ...v,
        shiftStart: timeToApi(v.shiftStart),
        shiftEnd: timeToApi(v.shiftEnd),
        fingerInFrom: timeToApi(v.fingerInFrom),
        fingerInTo: timeToApi(v.fingerInTo),
        fingerOutFrom: timeToApi(v.fingerOutFrom),
        fingerOutTo: timeToApi(v.fingerOutTo),
      };
      this.shiftsService.shiftsCreate(cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success && res.data) {
            this.notify.success('common.create_success');
            this.router.navigate(['/attendance/shifts']);
          } else if (res.message) {
            this.notify.errorText(res.message);
          } else {
            this.notify.error(null, 'common.save_error');
          }
        },
        error: (error) => {
          this.saving.set(false);
          this.notify.error(error, 'common.save_error');
        },
      });
    }
  }

  isInvalid(controlName: string): boolean {
    const control = this.form?.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
