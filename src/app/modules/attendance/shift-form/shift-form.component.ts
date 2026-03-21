import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';

import { MessageService } from 'primeng/api';
import { map } from 'rxjs/operators';
import {
  ShiftsService,
  CreateShiftCommand,
  UpdateShiftCommand,
} from '../../../core/api/generated';

function timeToApi(v: string): string {
  if (!v || v.length < 5) return '00:00:00';
  return v.length === 5 ? `${v}:00` : v;
}

@Component({
  selector: 'app-shift-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectButtonModule,
    CheckboxModule,
    MessageModule,
  ],
  templateUrl: './shift-form.component.html',
  styleUrl: './shift-form.component.scss',
})
export class ShiftFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shiftsService = inject(ShiftsService);
  private readonly messageService = inject(MessageService);

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
      this.form.get('code')?.clearValidators();
      this.form.get('code')?.updateValueAndValidity();
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
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'فشل تحميل الشيفت',
          });
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
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم تحديث الشيفت',
            });
            this.router.navigate(['/attendance/shifts']);
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
            this.messageService.add({
              severity: 'success',
              summary: 'تم',
              detail: 'تم إضافة الشيفت',
            });
            this.router.navigate(['/attendance/shifts']);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'خطأ',
              detail: res.message ?? 'فشل الإضافة',
            });
          }
        },
        error: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: 'حدث خطأ أثناء الإضافة',
          });
        },
      });
    }
  }
}
