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
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PermissionRequestService, EmployeeService, LanguageService, PermissionTypeService, PermissionTypeDto } from '../../../../core/services';
import { Employee } from '../../../../core/models/employee.model';
import {
  PermissionDurationType,
  HalfDayPeriod,
  SubmitPermissionRequestCommand,
  SubmitPermissionRequestResponse,
} from '../../../../core/models/permission-request.model';
import { PolicyEvaluationDialogComponent } from '../../shared/policy-evaluation-dialog/policy-evaluation-dialog.component';
import { EvaluateSubmitService } from '../../shared/evaluate-submit.service';
import { PermissionRequestPrintDialogComponent } from '../../shared/permission-request-print-dialog/permission-request-print-dialog.component';
import { TimeInputComponent, formatTimeFromDate, parseTimeToDate } from '../../../../shared';

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
    PermissionRequestPrintDialogComponent,
    TimeInputComponent,
  ],
  providers: [EvaluateSubmitService],
  templateUrl: './permission-request-form.component.html',
  styleUrl: './permission-request-form.component.scss',
})
export class PermissionRequestFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly permissionRequestService = inject(PermissionRequestService);
  private readonly permissionTypeService = inject(PermissionTypeService);
  private readonly employeeService = inject(EmployeeService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);
  readonly evaluateSubmit = inject(EvaluateSubmitService);

  readonly employees = signal<Employee[]>([]);
  readonly permissionTypes = signal<PermissionTypeDto[]>([]);
  readonly printDialogOpen = signal(false);
  readonly printRequestId = signal('');
  private navigateAfterPrint = false;

  readonly PermissionDurationType = PermissionDurationType;
  readonly HalfDayPeriod = HalfDayPeriod;

  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadEmployees();
    this.loadPermissionTypes();
  }

  private initForm(): void {
    this.form = this.fb.group({
      employeeId: ['', [Validators.required]],
      permissionTypeId: ['', [Validators.required]],
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

  private loadPermissionTypes(): void {
    this.permissionTypeService.getAll().subscribe({
      next: (types) => {
        this.permissionTypes.set(types || []);
        const current = this.form.get('permissionTypeId')?.value;
        if (!current && types?.length) {
          const hospital = types.find((t) => t.id === '66666666-6666-6666-6666-666666666666') ?? types[0];
          this.form.patchValue({ permissionTypeId: hospital.id });
        }
      },
      error: () => this.permissionTypes.set([]),
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
      onSuccess: (result) => {
        const id = (result as SubmitPermissionRequestResponse | undefined)?.id ?? '';
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('leave.permissions.submit_success'),
        });
        if (!id) {
          this.router.navigate(['/leave/permissions']);
          return;
        }
        this.confirmationService.confirm({
          header: this.translate.instant('leave.permissions.print.confirm_title'),
          message: this.translate.instant('leave.permissions.print.confirm_message'),
          icon: 'pi pi-print',
          acceptLabel: this.translate.instant('leave.permissions.print.confirm_accept'),
          rejectLabel: this.translate.instant('leave.permissions.print.confirm_reject'),
          acceptButtonStyleClass: 'p-button-primary',
          rejectButtonStyleClass: 'p-button-text p-button-secondary',
          accept: () => {
            this.navigateAfterPrint = true;
            this.printRequestId.set(id);
            this.printDialogOpen.set(true);
          },
          reject: () => this.router.navigate(['/leave/permissions']),
        });
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/leave/permissions']);
  }

  onPrintDialogVisibleChange(visible: boolean): void {
    this.printDialogOpen.set(visible);
    if (!visible && this.navigateAfterPrint) {
      this.navigateAfterPrint = false;
      this.router.navigate(['/leave/permissions']);
    }
  }

  private buildCommand(): SubmitPermissionRequestCommand {
    const val = this.form.value;
    return {
      employeeId: val.employeeId,
      permissionTypeId: val.permissionTypeId,
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

  private formatTime(val: Date | string | null | undefined): string | undefined {
    if (!val) return undefined;
    if (typeof val === 'string') return val;
    return formatTimeFromDate(parseTimeToDate(val), true) ?? undefined;
  }
}
