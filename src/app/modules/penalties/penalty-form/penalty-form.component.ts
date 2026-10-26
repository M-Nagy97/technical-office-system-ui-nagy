import { Component, input, output, signal, inject, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { CalendarModule } from 'primeng/calendar';
import { EmployeeService } from '../../../core/services/employee.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { PenaltyType, PenaltyStatus } from '../../../core/models/penalty.model';
import {
  CrudDialogComponent,
  FormActionsComponent,
  FormFieldComponent,
  PageHeaderComponent,
} from '../../../shared';

const TYPE_OPTIONS: { labelKey: string; value: PenaltyType }[] = [
  { labelKey: 'penalties.types.warning', value: 'warning' },
  { labelKey: 'penalties.types.written_warning', value: 'written_warning' },
  { labelKey: 'penalties.types.deduction', value: 'deduction' },
  { labelKey: 'penalties.types.suspension', value: 'suspension' },
  { labelKey: 'penalties.types.dismissal', value: 'dismissal' },
];
const STATUS_OPTIONS: { labelKey: string; value: PenaltyStatus }[] = [
  { labelKey: 'penalties.statuses.pending', value: 'pending' },
  { labelKey: 'penalties.statuses.approved', value: 'approved' },
  { labelKey: 'penalties.statuses.appealed', value: 'appealed' },
  { labelKey: 'penalties.statuses.cancelled', value: 'cancelled' },
];

@Component({
  selector: 'app-penalty-form',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    FormsModule,
    TranslatePipe,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    AutoCompleteModule,
    CalendarModule,
    CrudDialogComponent,
    FormFieldComponent,
    FormActionsComponent,
    PageHeaderComponent,
  ],
  templateUrl: './penalty-form.component.html',
  styleUrl: './penalty-form.component.scss',
})
export class PenaltyFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly employeeService = inject(EmployeeService);
  private readonly penaltyService = inject(PenaltyService);

  /** When true, form is shown inside a modal dialog. When false, form is shown as a full page (e.g. /penalties/add). */
  readonly dialogMode = input<boolean>(true);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly form: FormGroup;
  readonly employeeSuggestions = signal<{ id: string; fullName: string }[]>([]);
  readonly selectedEmployee = signal<{ id: string; fullName: string } | null>(null);
  readonly typeOptions = TYPE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  readonly showDeductionDays = computed(() => this.form?.get('type')?.value === 'deduction');
  readonly showSuspensionDays = computed(() => this.form?.get('type')?.value === 'suspension');

  constructor() {
    this.form = this.fb.group({
      employeeId: ['', Validators.required],
      employeeName: ['', Validators.required],
      type: ['warning' as PenaltyType, Validators.required],
      reason: ['', Validators.required],
      incidentDate: [null as Date | null, Validators.required],
      decisionDate: [null as Date | null, Validators.required],
      decisionNumber: ['', Validators.required],
      deductionDays: [null as number | null],
      suspensionDays: [null as number | null],
      status: ['pending', Validators.required],
      approvedBy: ['الإدارة', Validators.required],
      notes: [''],
    });
    this.form.get('type')?.valueChanges.subscribe(() => {
      const t = this.form.get('type')?.value;
      if (t !== 'deduction') this.form.patchValue({ deductionDays: null });
      if (t !== 'suspension') this.form.patchValue({ suspensionDays: null });
    });
  }

  searchEmployee(event: AutoCompleteCompleteEvent): void {
    const query = (event.query ?? '').toLowerCase();
    const list = this.employeeService.getList();
    const filtered = list
      .filter((e) => e.fullName.toLowerCase().includes(query))
      .map((e) => ({ id: e.id, fullName: e.fullName }));
    this.employeeSuggestions.set(filtered);
  }

  onEmployeeSelect(event: AutoCompleteSelectEvent): void {
    const emp = event.value as { id: string; fullName: string };
    this.selectedEmployee.set(emp);
    this.form.patchValue({ employeeId: emp.id, employeeName: emp.fullName });
  }

  onEmployeeClear(): void {
    this.selectedEmployee.set(null);
    this.form.patchValue({ employeeId: '', employeeName: '' });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const deductionDays = v.deductionDays != null ? Number(v.deductionDays) : undefined;
    const suspensionDays = v.suspensionDays != null ? Number(v.suspensionDays) : undefined;
    this.penaltyService.create({
      employeeId: v.employeeId,
      employeeName: v.employeeName,
      type: v.type,
      reason: v.reason,
      incidentDate: v.incidentDate ?? new Date(),
      decisionDate: v.decisionDate ?? new Date(),
      decisionNumber: v.decisionNumber,
      deductionDays,
      suspensionDays,
      status: v.status,
      approvedBy: v.approvedBy,
      notes: v.notes || undefined,
    });
    this.saved.emit();
  }

  close(): void {
    this.cancelled.emit();
  }

  printDecision(): void {
    window.print();
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }
}
