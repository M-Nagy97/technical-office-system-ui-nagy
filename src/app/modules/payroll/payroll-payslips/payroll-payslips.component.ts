import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  CreatePayslipCommand,
  EmployeesService,
  PayslipDto,
  PayslipStatus,
  PayslipsService,
  PayrollPeriodDto,
  PayrollPeriodsService,
  PayrollRunDto,
  PayrollRunsService,
  UpdatePayslipStatusCommand,
} from '../../../core/api/generated';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { employeeLabel } from '../utils/payroll-forms';

@Component({
  selector: 'app-payroll-payslips',
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
    InputTextModule,
    ToastModule,
    ConfirmPopupModule,
    SharedTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './payroll-payslips.component.html',
  styleUrl: './payroll-payslips.component.scss',
})
export class PayrollPayslipsComponent implements OnInit {
  private readonly periodsApi = inject(PayrollPeriodsService);
  private readonly runsApi = inject(PayrollRunsService);
  private readonly payslipsApi = inject(PayslipsService);
  private readonly employeesApi = inject(EmployeesService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly loadingPeriods = signal(false);
  readonly periodOptions = signal<{ label: string; value: string }[]>([]);
  readonly selectedPeriodId = signal<string | null>(null);

  readonly loadingRows = signal(false);
  readonly rows = signal<PayslipDto[]>([]);
  readonly runOptions = signal<{ label: string; value: string }[]>([]);
  private runById = new Map<string, PayrollRunDto>();

  readonly createOpen = signal(false);
  readonly statusOpen = signal(false);
  readonly saving = signal(false);
  formRunId: string | null = null;
  formNumber = '';
  formStatus: PayslipStatus = PayslipStatus.NUMBER_0;
  statusEditId: string | null = null;
  statusValue: PayslipStatus = PayslipStatus.NUMBER_0;

  statusOptions: { label: string; value: PayslipStatus }[] = [];

  readonly columns: SharedTableColumn<PayslipDto>[] = [
    { id: 'num', header: 'payroll.payslips.col_number', field: 'payslipNumber' },
    {
      id: 'emp',
      header: 'payroll.runs.col_employee',
      valueGetter: (p) => this.runEmployeeLabel(p.runId),
    },
    {
      id: 'gen',
      header: 'payroll.payslips.col_generated',
      valueGetter: (p) => (p.generatedAt ? new Date(p.generatedAt).toLocaleString() : '—'),
    },
    {
      id: 'st',
      header: 'payroll.payslips.col_status',
      valueGetter: (p) => this.translate.instant(this.payslipStatusKey(p.status)),
    },
  ];

  readonly actions: SharedTableAction<PayslipDto>[] = [
    {
      id: 'st',
      icon: 'pi pi-flag',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openStatus(row),
    },
    {
      id: 'del',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmDelete(e, row),
    },
  ];

  private empName = new Map<string, string>();

  ngOnInit(): void {
    this.rebuildStatusOptions();
    this.translate.onLangChange.subscribe(() => {
      this.rebuildStatusOptions();
      this.rows.update((x) => [...x]);
    });
    this.loadPeriods();
    this.loadEmployees();
  }

  private rebuildStatusOptions(): void {
    this.statusOptions = [
      { label: this.translate.instant('payroll.enums.payslip_status.generated'), value: PayslipStatus.NUMBER_0 },
      { label: this.translate.instant('payroll.enums.payslip_status.sent'), value: PayslipStatus.NUMBER_1 },
      { label: this.translate.instant('payroll.enums.payslip_status.ack'), value: PayslipStatus.NUMBER_2 },
    ];
  }

  private payslipStatusKey(v?: number | null): string {
    switch (v) {
      case 0:
        return 'payroll.enums.payslip_status.generated';
      case 1:
        return 'payroll.enums.payslip_status.sent';
      case 2:
        return 'payroll.enums.payslip_status.ack';
      default:
        return '—';
    }
  }

  loadEmployees(): void {
    this.employeesApi.employeesGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const m = new Map<string, string>();
          for (const e of res.data) {
            if (e.id) m.set(e.id, employeeLabel(e));
          }
          this.empName = m;
        }
      },
    });
  }

  loadPeriods(): void {
    this.loadingPeriods.set(true);
    this.periodsApi.payrollPeriodsList().subscribe({
      next: (res) => {
        this.loadingPeriods.set(false);
        const list = res.success && res.data ? res.data : [];
        this.periodOptions.set(
          list
            .filter((p): p is PayrollPeriodDto & { id: string } => !!p.id)
            .map((p) => ({
              label: `${p.periodName ?? ''} (${p.startDate?.slice(0, 10) ?? ''})`,
              value: p.id,
            }))
            .sort((a, b) => b.label.localeCompare(a.label))
        );
      },
      error: () => {
        this.loadingPeriods.set(false);
        this.toastErr('payroll.load_failed');
      },
    });
  }

  onPeriodChange(id: string | null): void {
    this.selectedPeriodId.set(id);
    if (!id) {
      this.rows.set([]);
      this.runOptions.set([]);
      return;
    }
    this.loadingRows.set(true);
    this.runsApi.payrollRunsByPeriod(id).subscribe({
      next: (runRes) => {
        const runs = runRes.success && runRes.data ? runRes.data : [];
        const map = new Map<string, PayrollRunDto>();
        const opts: { label: string; value: string }[] = [];
        for (const r of runs) {
          if (r.id) {
            map.set(r.id, r);
            opts.push({
              label: `${this.empName.get(r.employeeId ?? '') ?? r.employeeId} — ${this.translate.instant('payroll.runs.col_net')}: ${r.netSalary ?? 0}`,
              value: r.id,
            });
          }
        }
        this.runById = map;
        this.runOptions.set(opts);
        this.payslipsApi.payslipsByPeriod(id).subscribe({
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
      },
      error: () => {
        this.loadingRows.set(false);
        this.toastErr('payroll.load_failed');
      },
    });
  }

  private runEmployeeLabel(runId?: string | null): string {
    if (!runId) return '—';
    const r = this.runById.get(runId);
    if (!r) return runId;
    return this.empName.get(r.employeeId ?? '') ?? r.employeeId ?? runId;
  }

  openCreate(): void {
    if (!this.selectedPeriodId()) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.runs.pick_period'),
      });
      return;
    }
    this.formRunId = null;
    this.formNumber = '';
    this.formStatus = PayslipStatus.NUMBER_0;
    this.createOpen.set(true);
  }

  saveCreate(): void {
    if (!this.formRunId || !this.formNumber.trim()) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.payslips.validation'),
      });
      return;
    }
    this.saving.set(true);
    const cmd: CreatePayslipCommand = {
      runId: this.formRunId,
      payslipNumber: this.formNumber.trim(),
      status: this.formStatus,
    };
    this.payslipsApi.payslipsCreate(cmd).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.toastOk('payroll.saved');
          this.createOpen.set(false);
          this.onPeriodChange(this.selectedPeriodId());
        } else this.toastErr('payroll.save_failed', res.message);
      },
      error: () => {
        this.saving.set(false);
        this.toastErr('payroll.save_failed');
      },
    });
  }

  openStatus(row: PayslipDto): void {
    if (!row.id) return;
    this.statusEditId = row.id;
    this.statusValue = (row.status ?? 0) as PayslipStatus;
    this.statusOpen.set(true);
  }

  saveStatus(): void {
    const id = this.statusEditId;
    if (!id) return;
    this.saving.set(true);
    const cmd: UpdatePayslipStatusCommand = { id, status: this.statusValue };
    this.payslipsApi.payslipsUpdateStatus(id, cmd).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.toastOk('payroll.saved');
          this.statusOpen.set(false);
          this.onPeriodChange(this.selectedPeriodId());
        } else this.toastErr('payroll.save_failed', res.message);
      },
      error: () => {
        this.saving.set(false);
        this.toastErr('payroll.save_failed');
      },
    });
  }

  confirmDelete(event: Event, row: PayslipDto): void {
    if (!row.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.payslips.confirm_delete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.payslipsApi.payslipsDelete(row.id!).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastOk('payroll.deleted');
              this.onPeriodChange(this.selectedPeriodId());
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
