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
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LeaveRequestService, LeaveTypeService, EmployeeService, LanguageService } from '../../../../core/services';
import { LeaveTypeDto } from '../../../../core/services/leave-type.service';
import { Employee } from '../../../../core/models/employee.model';
import { SubmitLeaveRequestCommand } from '../../../../core/models/leave-request.model';
import { PolicyEvaluationDialogComponent } from '../../shared/policy-evaluation-dialog/policy-evaluation-dialog.component';
import { EvaluateSubmitService } from '../../shared/evaluate-submit.service';

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
  ],
  providers: [EvaluateSubmitService],
  templateUrl: './leave-request-form.component.html',
  styleUrl: './leave-request-form.component.scss',
})
export class LeaveRequestFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
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
    });

    this.form.get('startDate')?.valueChanges.subscribe(() => this.calcDays());
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

  submit(): void {
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
      onSuccess: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: this.translate.instant('leave.requests.submit_success'),
        });
        this.router.navigate(['/leave/requests']);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/leave/requests']);
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
