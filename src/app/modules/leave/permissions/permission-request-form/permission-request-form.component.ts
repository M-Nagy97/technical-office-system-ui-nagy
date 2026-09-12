import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PermissionRequestService, EmployeeService, LanguageService } from '../../../../core/services';
import { Employee } from '../../../../core/models/employee.model';
import {
  PermissionDurationType,
  HalfDayPeriod,
  SubmitPermissionRequestCommand,
} from '../../../../core/models/permission-request.model';
import { PolicyEvaluationDialogComponent } from '../../shared/policy-evaluation-dialog/policy-evaluation-dialog.component';
import { EvaluateSubmitService } from '../../shared/evaluate-submit.service';

@Component({
  selector: 'app-permission-request-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextareaModule,
    DropdownModule,
    CalendarModule,
    RadioButtonModule,
    TranslateModule,
    PolicyEvaluationDialogComponent,
  ],
  providers: [EvaluateSubmitService],
  templateUrl: './permission-request-form.component.html',
  styleUrl: './permission-request-form.component.scss',
})
export class PermissionRequestFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly permissionRequestService = inject(PermissionRequestService);
  private readonly employeeService = inject(EmployeeService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);
  readonly evaluateSubmit = inject(EvaluateSubmitService);

  readonly employees = signal<Employee[]>([]);

  readonly PermissionDurationType = PermissionDurationType;
  readonly HalfDayPeriod = HalfDayPeriod;

  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadEmployees();
  }

  private initForm(): void {
    this.form = this.fb.group({
      employeeId: ['', [Validators.required]],
      date: [null as Date | null, [Validators.required]],
      durationType: [PermissionDurationType.TimeRange, [Validators.required]],
      fromTime: [null, [Validators.required]],
      toTime: [null, [Validators.required]],
      halfDayPeriod: [HalfDayPeriod.Morning],
      reason: ['', [Validators.maxLength(500)]],
    });

    this.form.get('durationType')?.valueChanges.subscribe((type) => {
      const fromTimeCtrl = this.form.get('fromTime');
      const toTimeCtrl = this.form.get('toTime');
      const halfPeriodCtrl = this.form.get('halfDayPeriod');

      if (type === PermissionDurationType.TimeRange) {
        fromTimeCtrl?.setValidators([Validators.required]);
        toTimeCtrl?.setValidators([Validators.required]);
        halfPeriodCtrl?.clearValidators();
        halfPeriodCtrl?.setValue(null);
      } else {
        fromTimeCtrl?.clearValidators();
        fromTimeCtrl?.setValue(null);
        toTimeCtrl?.clearValidators();
        toTimeCtrl?.setValue(null);
        halfPeriodCtrl?.setValidators([Validators.required]);
        if (halfPeriodCtrl?.value === null || halfPeriodCtrl?.value === undefined) {
          halfPeriodCtrl?.setValue(HalfDayPeriod.Morning);
        }
      }

      fromTimeCtrl?.updateValueAndValidity();
      toTimeCtrl?.updateValueAndValidity();
      halfPeriodCtrl?.updateValueAndValidity();
    });
  }

  private loadEmployees(): void {
    this.employeeService.fetchAll().subscribe({
      next: (emps) => this.employees.set(emps || []),
      error: () => this.employees.set(this.employeeService.getList()),
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('leave.permissions.form_invalid_warn'),
      });
      return;
    }

    const command = this.buildCommand();
    this.evaluateSubmit.run(command, {
      evaluate: (cmd) => this.permissionRequestService.evaluate(cmd),
      submit: (cmd) => this.permissionRequestService.submit(cmd),
      onSuccess: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('leave.permissions.submit_success'),
        });
        this.router.navigate(['/leave/permissions']);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/leave/permissions']);
  }

  private buildCommand(): SubmitPermissionRequestCommand {
    const val = this.form.value;
    return {
      employeeId: val.employeeId,
      date: this.formatDate(val.date),
      durationType: Number(val.durationType),
      fromTime:
        val.durationType === PermissionDurationType.TimeRange
          ? this.formatTime(val.fromTime)
          : undefined,
      toTime:
        val.durationType === PermissionDurationType.TimeRange
          ? this.formatTime(val.toTime)
          : undefined,
      halfDayPeriod:
        val.durationType === PermissionDurationType.HalfDay
          ? Number(val.halfDayPeriod)
          : undefined,
      reason: val.reason?.trim() || undefined,
    };
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatTime(val: any): string | undefined {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    if (val instanceof Date) {
      const h = String(val.getHours()).padStart(2, '0');
      const m = String(val.getMinutes()).padStart(2, '0');
      return `${h}:${m}:00`;
    }
    return String(val);
  }
}
