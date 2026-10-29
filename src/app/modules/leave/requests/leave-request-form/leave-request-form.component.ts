import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LeaveRequestService, LeaveTypeService, EmployeeService, LanguageService } from '../../../../core/services';
import {
  COMPENSATORY_LEAVE_TYPE_ID,
  CompensatoryCreditDto,
} from '../../../../core/services/leave-request.service';
import { LeaveTypeDto } from '../../../../core/services/leave-type.service';
import { Employee } from '../../../../core/models/employee.model';
import { SubmitLeaveRequestCommand, SubmitLeaveRequestResponse } from '../../../../core/models/leave-request.model';
import { PolicyEvaluationDialogComponent } from '../../shared/policy-evaluation-dialog/policy-evaluation-dialog.component';
import { EvaluateSubmitService } from '../../shared/evaluate-submit.service';
import { LeaveRequestPrintDialogComponent } from '../../shared/leave-request-print-dialog/leave-request-print-dialog.component';

@Component({
  selector: 'app-leave-request-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    CalendarModule,
    TranslateModule,
    PolicyEvaluationDialogComponent,
    LeaveRequestPrintDialogComponent,
  ],
  providers: [EvaluateSubmitService],
  templateUrl: './leave-request-form.component.html',
  styleUrl: './leave-request-form.component.scss',
})
export class LeaveRequestFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly employeeService = inject(EmployeeService);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);
  readonly evaluateSubmit = inject(EvaluateSubmitService);

  readonly leaveTypes = signal<LeaveTypeDto[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly requiresDocument = signal(false);
  readonly computedDays = signal<number | null>(null);
  readonly isCompensatory = signal(false);
  readonly compensatoryCredits = signal<CompensatoryCreditDto[]>([]);
  readonly loadingCredits = signal(false);
  readonly printDialogOpen = signal(false);
  readonly printRequestId = signal('');
  private navigateAfterPrint = false;

  form!: FormGroup;

  readonly leaveTypeOptionLabel = computed(() =>
    this.languageService.currentLang() === 'en' ? 'name' : 'arabicName'
  );

  ngOnInit(): void {
    this.initForm();
    this.loadEmployees();
    this.loadLeaveTypes();
  }

  private initForm(): void {
    this.form = this.fb.group({
      employeeId: ['', [Validators.required]],
      leaveTypeId: ['', [Validators.required]],
      startDate: [null as Date | null, [Validators.required]],
      endDate: [null as Date | null, [Validators.required]],
      reason: ['', [Validators.maxLength(500)]],
      attachmentUrl: [''],
    });

    this.form.get('leaveTypeId')?.valueChanges.subscribe((typeId) => {
      const type = this.leaveTypes().find((t) => t.id === typeId);
      const reqDoc = type?.requiresDocument ?? false;
      this.requiresDocument.set(reqDoc);

      const attachCtrl = this.form.get('attachmentUrl');
      if (reqDoc) {
        attachCtrl?.setValidators([Validators.required]);
      } else {
        attachCtrl?.clearValidators();
      }
      attachCtrl?.updateValueAndValidity();
      this.onCompensatoryModeChanged();
    });

    this.form.get('employeeId')?.valueChanges.subscribe(() => this.loadCompensatoryCredits());
    this.form.get('startDate')?.valueChanges.subscribe((start: Date | null) => {
      if (this.isCompensatory() && start) {
        this.form.get('endDate')?.setValue(start, { emitEvent: false });
      }
      this.calcDays();
    });
    this.form.get('endDate')?.valueChanges.subscribe(() => this.calcDays());
  }

  private calcDays(): void {
    const start: Date | null = this.form.get('startDate')?.value;
    const end: Date | null = this.form.get('endDate')?.value;

    if (!start || !end) {
      this.computedDays.set(null);
      return;
    }

    const s = new Date(start).setHours(0, 0, 0, 0);
    const e = new Date(end).setHours(0, 0, 0, 0);

    if (e < s) {
      this.computedDays.set(0);
      return;
    }

    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    this.computedDays.set(diffDays);
  }

  private loadEmployees(): void {
    this.employeeService.fetchAll().subscribe({
      next: (emps) => this.employees.set(emps || []),
      error: () => this.employees.set(this.employeeService.getList()),
    });
  }

  private loadLeaveTypes(): void {
    this.leaveTypeService.getAll().subscribe({
      next: (types) => {
        this.leaveTypes.set(types.filter((t) => t.isActive));
      },
    });
  }

  private onCompensatoryModeChanged(): void {
    const typeId = this.form.get('leaveTypeId')?.value as string;
    const type = this.leaveTypes().find((t) => t.id === typeId);
    const compensatory =
      typeId === COMPENSATORY_LEAVE_TYPE_ID ||
      type?.arabicName === 'بدل راحة' ||
      type?.name === 'Compensatory Leave';
    this.isCompensatory.set(compensatory);
    const endCtrl = this.form.get('endDate');
    if (compensatory) {
      const start = this.form.get('startDate')?.value as Date | null;
      if (start) endCtrl?.setValue(start, { emitEvent: false });
      this.calcDays();
      this.loadCompensatoryCredits();
    } else {
      this.compensatoryCredits.set([]);
    }
  }

  private loadCompensatoryCredits(): void {
    if (!this.isCompensatory()) return;
    const employeeId = this.form.get('employeeId')?.value as string;
    if (!employeeId) {
      this.compensatoryCredits.set([]);
      return;
    }
    this.loadingCredits.set(true);
    this.leaveRequestService.getCompensatoryCredits(employeeId).subscribe({
      next: (rows) => {
        this.compensatoryCredits.set(rows ?? []);
        this.loadingCredits.set(false);
      },
      error: () => {
        this.compensatoryCredits.set([]);
        this.loadingCredits.set(false);
      },
    });
  }

  submit(): void {
    if (this.isCompensatory() && this.compensatoryCredits().length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('leave.requests.no_compensatory_credits'),
      });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('leave.requests.form_invalid_warn'),
      });
      return;
    }

    const days = this.computedDays();
    if (days !== null && days <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('leave.requests.invalid_range_warn'),
      });
      return;
    }

    const command = this.buildCommand();
    this.evaluateSubmit.run(command, {
      evaluate: (cmd) => this.leaveRequestService.evaluate(cmd),
      submit: (cmd) => this.leaveRequestService.submit(cmd),
      onSuccess: (result) => {
        const id = (result as SubmitLeaveRequestResponse | undefined)?.id ?? '';
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('leave.requests.submit_success'),
        });
        if (!id) {
          this.router.navigate(['/leave/requests']);
          return;
        }
        this.confirmationService.confirm({
          header: this.translate.instant('leave.print.confirm_title'),
          message: this.translate.instant('leave.print.confirm_message'),
          icon: 'pi pi-print',
          acceptLabel: this.translate.instant('leave.print.confirm_accept'),
          rejectLabel: this.translate.instant('leave.print.confirm_reject'),
          acceptButtonStyleClass: 'p-button-primary',
          rejectButtonStyleClass: 'p-button-text p-button-secondary',
          accept: () => {
            this.navigateAfterPrint = true;
            this.printRequestId.set(id);
            this.printDialogOpen.set(true);
          },
          reject: () => this.router.navigate(['/leave/requests']),
        });
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/leave/requests']);
  }

  onPrintDialogVisibleChange(visible: boolean): void {
    this.printDialogOpen.set(visible);
    if (!visible && this.navigateAfterPrint) {
      this.navigateAfterPrint = false;
      this.router.navigate(['/leave/requests']);
    }
  }

  private buildCommand(): SubmitLeaveRequestCommand {
    const val = this.form.value;
    return {
      employeeId: val.employeeId,
      leaveTypeId: val.leaveTypeId,
      startDate: this.formatDate(val.startDate),
      endDate: this.formatDate(val.endDate),
      reason: val.reason?.trim() || undefined,
      attachmentUrl: val.attachmentUrl?.trim() || undefined,
    };
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
