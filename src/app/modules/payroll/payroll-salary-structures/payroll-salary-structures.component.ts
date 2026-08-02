import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  CreateSalaryStructureCommand,
  EmployeeDto,
  EmployeesService,
  SalaryStructureDto,
  SalaryStructuresService,
  UpdateSalaryStructureCommand,
} from '../../../core/api/generated';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { employeeLabel } from '../utils/payroll-forms';

@Component({
  selector: 'app-payroll-salary-structures',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputNumberModule,
    InputSwitchModule,
    ToastModule,
    ConfirmPopupModule,
    SharedTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './payroll-salary-structures.component.html',
  styleUrl: './payroll-salary-structures.component.scss',
})
export class PayrollSalaryStructuresComponent implements OnInit {
  private readonly api = inject(SalaryStructuresService);
  private readonly employeesApi = inject(EmployeesService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly loadingEmployees = signal(false);
  readonly loadingRows = signal(false);
  readonly saving = signal(false);
  readonly employees = signal<EmployeeDto[]>([]);
  readonly employeeOptions = signal<{ label: string; value: string }[]>([]);
  readonly selectedEmployeeId = signal<string | null>(null);
  readonly rows = signal<SalaryStructureDto[]>([]);
  readonly dialogVisible = signal(false);
  readonly editingId = signal<string | null>(null);

  formBase = 0;
  formHourly = 0;
  formOt = 0;
  formFrom = '';
  formTo = '';
  formActive = true;

  readonly columns: SharedTableColumn<SalaryStructureDto>[] = [
    {
      id: 'base',
      header: 'payroll.salary.col_base',
      valueGetter: (r) => this.fmtMoney(r.baseSalary),
    },
    {
      id: 'hourly',
      header: 'payroll.salary.col_hourly',
      valueGetter: (r) => this.fmtMoney(r.hourlyRate),
    },
    { id: 'ot', header: 'payroll.salary.col_ot', valueGetter: (r) => this.fmtMoney(r.overtimeRate) },
    { id: 'from', header: 'payroll.salary.col_from', valueGetter: (r) => r.effectiveFrom?.slice(0, 10) ?? '—' },
    { id: 'to', header: 'payroll.salary.col_to', valueGetter: (r) => r.effectiveTo?.slice(0, 10) ?? '—' },
    {
      id: 'act',
      header: 'payroll.lookups.col_active',
      valueGetter: (r) => (r.isActive ? this.translate.instant('payroll.yes') : this.translate.instant('payroll.no')),
    },
  ];

  readonly actions: SharedTableAction<SalaryStructureDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openEdit(row),
    },
    {
      id: 'del',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmDelete(e, row),
    },
  ];

  ngOnInit(): void {
    this.translate.onLangChange.subscribe(() => this.refreshEmployeeLabels());
    this.loadEmployees();
  }

  private fmtMoney(v?: number | null): string {
    if (v == null) return '—';
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  loadEmployees(): void {
    this.loadingEmployees.set(true);
    this.employeesApi.employeesGetAll().subscribe({
      next: (res) => {
        this.loadingEmployees.set(false);
        if (res.success && res.data) {
          this.employees.set(res.data);
          this.refreshEmployeeLabels();
        }
      },
      error: () => {
        this.loadingEmployees.set(false);
        this.toastErr('payroll.load_failed');
      },
    });
  }

  private refreshEmployeeLabels(): void {
    const opts = this.employees()
      .filter((e) => e.id)
      .map((e) => ({ label: employeeLabel(e), value: e.id! }))
      .sort((a, b) => a.label.localeCompare(b.label));
    this.employeeOptions.set(opts);
  }

  onEmployeeChange(id: string | null): void {
    this.selectedEmployeeId.set(id);
    if (!id) {
      this.rows.set([]);
      return;
    }
    this.loadingRows.set(true);
    this.api.salaryStructuresByEmployee(id).subscribe({
      next: (res) => {
        this.loadingRows.set(false);
        if (res.success && res.data) this.rows.set(res.data);
        else this.rows.set([]);
      },
      error: () => {
        this.loadingRows.set(false);
        this.toastErr('payroll.load_failed');
      },
    });
  }

  openCreate(): void {
    if (!this.selectedEmployeeId()) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.salary.pick_employee'),
      });
      return;
    }
    this.editingId.set(null);
    this.formBase = 0;
    this.formHourly = 0;
    this.formOt = 0;
    this.formFrom = '';
    this.formTo = '';
    this.formActive = true;
    this.dialogVisible.set(true);
  }

  openEdit(row: SalaryStructureDto): void {
    if (!row.id) return;
    this.editingId.set(row.id);
    this.formBase = row.baseSalary ?? 0;
    this.formHourly = row.hourlyRate ?? 0;
    this.formOt = row.overtimeRate ?? 0;
    this.formFrom = row.effectiveFrom?.slice(0, 10) ?? '';
    this.formTo = row.effectiveTo?.slice(0, 10) ?? '';
    this.formActive = row.isActive ?? true;
    this.dialogVisible.set(true);
  }

  save(): void {
    const from = this.formFrom;
    if (!from) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.salary.validation_from'),
      });
      return;
    }
    const empId = this.selectedEmployeeId();
    this.saving.set(true);
    const id = this.editingId();
    if (id) {
      const cmd: UpdateSalaryStructureCommand = {
        id,
        baseSalary: this.formBase,
        hourlyRate: this.formHourly,
        overtimeRate: this.formOt,
        effectiveFrom: from,
        effectiveTo: this.formTo || null,
        isActive: this.formActive,
      };
      this.api.salaryStructuresUpdate(id, cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastOk('payroll.saved');
            this.dialogVisible.set(false);
            this.onEmployeeChange(empId);
          } else this.toastErr('payroll.save_failed', res.message);
        },
        error: () => {
          this.saving.set(false);
          this.toastErr('payroll.save_failed');
        },
      });
    } else {
      if (!empId) {
        this.saving.set(false);
        return;
      }
      const cmd: CreateSalaryStructureCommand = {
        employeeId: empId,
        baseSalary: this.formBase,
        hourlyRate: this.formHourly,
        overtimeRate: this.formOt,
        effectiveFrom: from,
        effectiveTo: this.formTo || null,
        isActive: this.formActive,
      };
      this.api.salaryStructuresCreate(cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastOk('payroll.saved');
            this.dialogVisible.set(false);
            this.onEmployeeChange(empId);
          } else this.toastErr('payroll.save_failed', res.message);
        },
        error: () => {
          this.saving.set(false);
          this.toastErr('payroll.save_failed');
        },
      });
    }
  }

  confirmDelete(event: Event, row: SalaryStructureDto): void {
    if (!row.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.salary.confirm_delete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.api.salaryStructuresDelete(row.id!).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastOk('payroll.deleted');
              this.onEmployeeChange(this.selectedEmployeeId());
            } else this.toastErr('payroll.delete_failed', res.message);
          },
          error: () => this.toastErr('payroll.delete_failed'),
        }),
    });
  }

  private toastErr(key: string, msg?: string | null): void {
    this.messages.add({
      severity: 'error',
      summary: this.translate.instant('common.error'),
      detail: msg ?? this.translate.instant(key),
    });
  }

  private toastOk(key: string): void {
    this.messages.add({
      severity: 'success',
      summary: this.translate.instant('common.success'),
      detail: this.translate.instant(key),
    });
  }
}
