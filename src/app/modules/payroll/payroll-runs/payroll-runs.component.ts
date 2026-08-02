import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  AddPayrollAllowanceCommand,
  AddPayrollDeductionCommand,
  AttendanceSummaryDto,
  CreatePayrollRunCommand,
  EmployeesService,
  PayrollAllowanceDto,
  PayrollAttendanceSummariesService,
  PayrollDeductionDto,
  PayrollPeriodDto,
  PayrollAllowanceTypesService,
  PayrollDeductionTypesService,
  PayrollPeriodsService,
  PayrollRunDto,
  PayrollRunStatus,
  PayrollRunsService,
  UpdatePayrollRunCommand,
  UpsertAttendanceSummaryCommand,
} from '../../../core/api/generated';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { employeeLabel } from '../utils/payroll-forms';

@Component({
  selector: 'app-payroll-runs',
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
    InputTextModule,
    TabViewModule,
    ToastModule,
    ConfirmPopupModule,
    SharedTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './payroll-runs.component.html',
  styleUrl: './payroll-runs.component.scss',
})
export class PayrollRunsComponent implements OnInit {
  private readonly periodsApi = inject(PayrollPeriodsService);
  private readonly runsApi = inject(PayrollRunsService);
  private readonly attApi = inject(PayrollAttendanceSummariesService);
  private readonly employeesApi = inject(EmployeesService);
  private readonly deductionTypesApi = inject(PayrollDeductionTypesService);
  private readonly allowanceTypesApi = inject(PayrollAllowanceTypesService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly loadingPeriods = signal(false);
  readonly periodOptions = signal<{ label: string; value: string }[]>([]);
  readonly selectedPeriodId = signal<string | null>(null);

  readonly loadingRuns = signal(false);
  readonly runs = signal<PayrollRunDto[]>([]);
  readonly loadingAtt = signal(false);
  readonly attendanceRows = signal<AttendanceSummaryDto[]>([]);

  readonly employeeOptions = signal<{ label: string; value: string }[]>([]);
  empName = new Map<string, string>();
  private dedTypeLabels = new Map<string, string>();
  private allTypeLabels = new Map<string, string>();

  readonly createRunOpen = signal(false);
  readonly saving = signal(false);
  crEmployeeId: string | null = null;
  crBase = 0;
  crOt = 0;
  crAbs = 0;
  crLate = 0;
  crGross = 0;
  crDed = 0;
  crNet = 0;
  crStatus: PayrollRunStatus = PayrollRunStatus.NUMBER_0;
  runStatusOptions: { label: string; value: PayrollRunStatus }[] = [];

  readonly detailOpen = signal(false);
  readonly detailRun = signal<PayrollRunDto | null>(null);
  dBase = 0;
  dOt = 0;
  dAbs = 0;
  dLate = 0;
  dGross = 0;
  dDed = 0;
  dNet = 0;
  dStatus: PayrollRunStatus = PayrollRunStatus.NUMBER_0;
  readonly deductions = signal<PayrollDeductionDto[]>([]);
  readonly allowances = signal<PayrollAllowanceDto[]>([]);
  readonly loadingLines = signal(false);

  readonly addDedOpen = signal(false);
  adTypeId: string | null = null;
  adAmount = 0;
  adNote = '';
  readonly dedTypeOptions = signal<{ label: string; value: string }[]>([]);

  readonly addAllOpen = signal(false);
  aaTypeId: string | null = null;
  aaAmount = 0;
  aaNote = '';
  readonly allTypeOptions = signal<{ label: string; value: string }[]>([]);

  readonly attDialogOpen = signal(false);
  attEditId: string | null = null;
  attEmpId: string | null = null;
  attWork = 0;
  attAbs = 0;
  attHours = 0;
  attOt = 0;
  attLateH = 0;

  readonly runColumns: SharedTableColumn<PayrollRunDto>[] = [
    {
      id: 'emp',
      header: 'payroll.runs.col_employee',
      valueGetter: (r) => this.empName.get(r.employeeId ?? '') ?? r.employeeId ?? '—',
    },
    { id: 'net', header: 'payroll.runs.col_net', valueGetter: (r) => this.fmt(r.netSalary) },
    {
      id: 'st',
      header: 'payroll.runs.col_status',
      valueGetter: (r) => this.translate.instant(this.runStatusKey(r.status)),
    },
  ];

  readonly runActions: SharedTableAction<PayrollRunDto>[] = [
    {
      id: 'open',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openDetail(row),
    },
    {
      id: 'del',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmRunDelete(e, row),
    },
  ];

  readonly attColumns: SharedTableColumn<AttendanceSummaryDto>[] = [
    {
      id: 'emp',
      header: 'payroll.runs.col_employee',
      valueGetter: (r) => this.empName.get(r.employeeId ?? '') ?? r.employeeId ?? '—',
    },
    { id: 'wd', header: 'payroll.att.working_days', valueGetter: (r) => r.workingDays ?? '—' },
    { id: 'ab', header: 'payroll.att.absent_days', valueGetter: (r) => r.absentDays ?? '—' },
    { id: 'hrs', header: 'payroll.att.total_hours', valueGetter: (r) => r.totalHoursWorked ?? '—' },
  ];

  readonly attActions: SharedTableAction<AttendanceSummaryDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openAttEdit(row),
    },
    {
      id: 'del',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmAttDelete(e, row),
    },
  ];

  readonly dedLineCols: SharedTableColumn<PayrollDeductionDto>[] = [
    {
      id: 't',
      header: 'payroll.runs.line_type',
      valueGetter: (r) => this.dedTypeLabels.get(r.deductionTypeId ?? '') ?? r.deductionTypeId ?? '—',
    },
    { id: 'a', header: 'payroll.lookups.col_value', valueGetter: (r) => this.fmt(r.amount) },
    { id: 'n', header: 'payroll.runs.note', valueGetter: (r) => r.note ?? '—' },
  ];

  readonly dedLineActions: SharedTableAction<PayrollDeductionDto>[] = [
    {
      id: 'rm',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmRemoveDed(e, row),
    },
  ];

  readonly allLineCols: SharedTableColumn<PayrollAllowanceDto>[] = [
    {
      id: 't',
      header: 'payroll.runs.line_type',
      valueGetter: (r) => this.allTypeLabels.get(r.allowanceTypeId ?? '') ?? r.allowanceTypeId ?? '—',
    },
    { id: 'a', header: 'payroll.lookups.col_value', valueGetter: (r) => this.fmt(r.amount) },
    { id: 'n', header: 'payroll.runs.note', valueGetter: (r) => r.note ?? '—' },
  ];

  readonly allLineActions: SharedTableAction<PayrollAllowanceDto>[] = [
    {
      id: 'rm',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmRemoveAll(e, row),
    },
  ];

  ngOnInit(): void {
    this.rebuildRunStatusOptions();
    this.translate.onLangChange.subscribe(() => {
      this.rebuildRunStatusOptions();
      this.runs.update((x) => [...x]);
    });
    this.loadPeriods();
    this.loadEmployees();
    this.loadLookupOptions();
  }

  private rebuildRunStatusOptions(): void {
    this.runStatusOptions = [
      { label: this.translate.instant('payroll.enums.run_status.draft'), value: PayrollRunStatus.NUMBER_0 },
      { label: this.translate.instant('payroll.enums.run_status.approved'), value: PayrollRunStatus.NUMBER_1 },
      { label: this.translate.instant('payroll.enums.run_status.paid'), value: PayrollRunStatus.NUMBER_2 },
      { label: this.translate.instant('payroll.enums.run_status.cancelled'), value: PayrollRunStatus.NUMBER_3 },
    ];
  }

  private runStatusKey(v?: number | null): string {
    switch (v) {
      case 0:
        return 'payroll.enums.run_status.draft';
      case 1:
        return 'payroll.enums.run_status.approved';
      case 2:
        return 'payroll.enums.run_status.paid';
      case 3:
        return 'payroll.enums.run_status.cancelled';
      default:
        return '—';
    }
  }

  private fmt(v?: number | null): string {
    if (v == null) return '—';
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  loadPeriods(): void {
    this.loadingPeriods.set(true);
    this.periodsApi.payrollPeriodsList().subscribe({
      next: (res) => {
        this.loadingPeriods.set(false);
        const list = res.success && res.data ? res.data : [];
        const opts = list
          .filter((p): p is PayrollPeriodDto & { id: string } => !!p.id)
          .map((p) => ({
            label: `${p.periodName ?? ''} (${p.startDate?.slice(0, 10) ?? ''})`,
            value: p.id,
          }))
          .sort((a, b) => b.label.localeCompare(a.label));
        this.periodOptions.set(opts);
      },
      error: () => {
        this.loadingPeriods.set(false);
        this.toastErr('payroll.load_failed');
      },
    });
  }

  loadEmployees(): void {
    this.employeesApi.employeesGetAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const map = new Map<string, string>();
          for (const e of res.data) {
            if (e.id) map.set(e.id, employeeLabel(e));
          }
          this.empName = map;
          this.employeeOptions.set(
            res.data
              .filter((e) => e.id)
              .map((e) => ({ label: employeeLabel(e), value: e.id! }))
              .sort((a, b) => a.label.localeCompare(b.label))
          );
        }
      },
    });
  }

  loadLookupOptions(): void {
    this.deductionTypesApi.payrollDeductionTypesList().subscribe((res) => {
      if (res.success && res.data) {
        const m = new Map<string, string>();
        for (const d of res.data) {
          if (d.id) m.set(d.id, d.name ?? d.id);
        }
        this.dedTypeLabels = m;
        this.dedTypeOptions.set(
          res.data.filter((d) => d.id).map((d) => ({ label: d.name ?? d.id!, value: d.id! }))
        );
      }
    });
    this.allowanceTypesApi.payrollAllowanceTypesList().subscribe((res) => {
      if (res.success && res.data) {
        const m = new Map<string, string>();
        for (const d of res.data) {
          if (d.id) m.set(d.id, d.name ?? d.id);
        }
        this.allTypeLabels = m;
        this.allTypeOptions.set(
          res.data.filter((d) => d.id).map((d) => ({ label: d.name ?? d.id!, value: d.id! }))
        );
      }
    });
  }

  onPeriodChange(id: string | null): void {
    this.selectedPeriodId.set(id);
    if (!id) {
      this.runs.set([]);
      this.attendanceRows.set([]);
      return;
    }
    this.refreshRuns();
    this.refreshAtt();
  }

  refreshRuns(): void {
    const pid = this.selectedPeriodId();
    if (!pid) return;
    this.loadingRuns.set(true);
    this.runsApi.payrollRunsByPeriod(pid).subscribe({
      next: (res) => {
        this.loadingRuns.set(false);
        if (res.success && res.data) this.runs.set(res.data);
        else this.runs.set([]);
      },
      error: () => {
        this.loadingRuns.set(false);
        this.toastErr('payroll.load_failed');
      },
    });
  }

  refreshAtt(): void {
    const pid = this.selectedPeriodId();
    if (!pid) return;
    this.loadingAtt.set(true);
    this.attApi.payrollAttendanceSummariesByPeriod(pid).subscribe({
      next: (res) => {
        this.loadingAtt.set(false);
        if (res.success && res.data) this.attendanceRows.set(res.data);
        else this.attendanceRows.set([]);
      },
      error: () => {
        this.loadingAtt.set(false);
        this.toastErr('payroll.load_failed');
      },
    });
  }

  openCreateRun(): void {
    const pid = this.selectedPeriodId();
    if (!pid) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.runs.pick_period'),
      });
      return;
    }
    this.crEmployeeId = null;
    this.crBase = 0;
    this.crOt = 0;
    this.crAbs = 0;
    this.crLate = 0;
    this.crGross = 0;
    this.crDed = 0;
    this.crNet = 0;
    this.crStatus = PayrollRunStatus.NUMBER_0;
    this.createRunOpen.set(true);
  }

  saveCreateRun(): void {
    const pid = this.selectedPeriodId();
    if (!pid || !this.crEmployeeId) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.runs.validation_run'),
      });
      return;
    }
    this.saving.set(true);
    const cmd: CreatePayrollRunCommand = {
      periodId: pid,
      employeeId: this.crEmployeeId,
      baseSalary: this.crBase,
      overtimeAmount: this.crOt,
      absenceDeduction: this.crAbs,
      lateDeduction: this.crLate,
      grossSalary: this.crGross,
      totalDeductions: this.crDed,
      netSalary: this.crNet,
      status: this.crStatus,
    };
    this.runsApi.payrollRunsCreate(cmd).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.toastOk('payroll.saved');
          this.createRunOpen.set(false);
          this.refreshRuns();
        } else this.toastErr('payroll.save_failed', res.message);
      },
      error: () => {
        this.saving.set(false);
        this.toastErr('payroll.save_failed');
      },
    });
  }

  openDetail(row: PayrollRunDto): void {
    if (!row.id) return;
    this.detailRun.set(row);
    this.dBase = row.baseSalary ?? 0;
    this.dOt = row.overtimeAmount ?? 0;
    this.dAbs = row.absenceDeduction ?? 0;
    this.dLate = row.lateDeduction ?? 0;
    this.dGross = row.grossSalary ?? 0;
    this.dDed = row.totalDeductions ?? 0;
    this.dNet = row.netSalary ?? 0;
    this.dStatus = (row.status ?? 0) as PayrollRunStatus;
    this.detailOpen.set(true);
    this.loadLines(row.id);
  }

  loadLines(runId: string): void {
    this.loadingLines.set(true);
    forkJoin({
      d: this.runsApi.payrollRunsDeductionsByRun(runId),
      a: this.runsApi.payrollRunsAllowancesByRun(runId),
    }).subscribe({
      next: ({ d, a }) => {
        this.loadingLines.set(false);
        this.deductions.set(d.success && d.data ? d.data : []);
        this.allowances.set(a.success && a.data ? a.data : []);
      },
      error: () => this.loadingLines.set(false),
    });
  }

  saveDetailRun(): void {
    const run = this.detailRun();
    if (!run?.id) return;
    this.saving.set(true);
    const cmd: UpdatePayrollRunCommand = {
      id: run.id,
      baseSalary: this.dBase,
      overtimeAmount: this.dOt,
      absenceDeduction: this.dAbs,
      lateDeduction: this.dLate,
      grossSalary: this.dGross,
      totalDeductions: this.dDed,
      netSalary: this.dNet,
      status: this.dStatus,
    };
    this.runsApi.payrollRunsUpdate(run.id, cmd).subscribe({
      next: (res) => {
        this.saving.set(false);
        if (res.success) {
          this.toastOk('payroll.saved');
          this.detailOpen.set(false);
          this.refreshRuns();
        } else this.toastErr('payroll.save_failed', res.message);
      },
      error: () => {
        this.saving.set(false);
        this.toastErr('payroll.save_failed');
      },
    });
  }

  openAddDed(): void {
    this.adTypeId = null;
    this.adAmount = 0;
    this.adNote = '';
    this.addDedOpen.set(true);
  }

  saveAddDed(): void {
    const run = this.detailRun();
    if (!run?.id || !this.adTypeId) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.runs.validation_line'),
      });
      return;
    }
    const cmd: AddPayrollDeductionCommand = { runId: run.id, deductionTypeId: this.adTypeId, amount: this.adAmount, note: this.adNote || null };
    this.runsApi.payrollRunsAddDeduction(cmd).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastOk('payroll.saved');
          this.addDedOpen.set(false);
          this.loadLines(run.id!);
        } else this.toastErr('payroll.save_failed', res.message);
      },
      error: () => this.toastErr('payroll.save_failed'),
    });
  }

  confirmRemoveDed(event: Event, row: PayrollDeductionDto): void {
    const run = this.detailRun();
    if (!row.id || !run?.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.runs.confirm_remove_line'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.runsApi.payrollRunsRemoveDeduction(row.id!).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastOk('payroll.deleted');
              this.loadLines(run.id!);
            } else this.toastErr('payroll.delete_failed', res.message);
          },
          error: () => this.toastErr('payroll.delete_failed'),
        }),
    });
  }

  openAddAll(): void {
    this.aaTypeId = null;
    this.aaAmount = 0;
    this.aaNote = '';
    this.addAllOpen.set(true);
  }

  saveAddAll(): void {
    const run = this.detailRun();
    if (!run?.id || !this.aaTypeId) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.runs.validation_line'),
      });
      return;
    }
    const cmd: AddPayrollAllowanceCommand = { runId: run.id, allowanceTypeId: this.aaTypeId, amount: this.aaAmount, note: this.aaNote || null };
    this.runsApi.payrollRunsAddAllowance(cmd).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastOk('payroll.saved');
          this.addAllOpen.set(false);
          this.loadLines(run.id!);
        } else this.toastErr('payroll.save_failed', res.message);
      },
      error: () => this.toastErr('payroll.save_failed'),
    });
  }

  confirmRemoveAll(event: Event, row: PayrollAllowanceDto): void {
    const run = this.detailRun();
    if (!row.id || !run?.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.runs.confirm_remove_line'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.runsApi.payrollRunsRemoveAllowance(row.id!).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastOk('payroll.deleted');
              this.loadLines(run.id!);
            } else this.toastErr('payroll.delete_failed', res.message);
          },
          error: () => this.toastErr('payroll.delete_failed'),
        }),
    });
  }

  confirmRunDelete(event: Event, row: PayrollRunDto): void {
    if (!row.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.runs.confirm_delete_run'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.runsApi.payrollRunsDelete(row.id!).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastOk('payroll.deleted');
              this.refreshRuns();
            } else this.toastErr('payroll.delete_failed', res.message);
          },
          error: () => this.toastErr('payroll.delete_failed'),
        }),
    });
  }

  openAttCreate(): void {
    const pid = this.selectedPeriodId();
    if (!pid) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.runs.pick_period'),
      });
      return;
    }
    this.attEditId = null;
    this.attEmpId = null;
    this.attWork = 0;
    this.attAbs = 0;
    this.attHours = 0;
    this.attOt = 0;
    this.attLateH = 0;
    this.attDialogOpen.set(true);
  }

  openAttEdit(row: AttendanceSummaryDto): void {
    this.attEditId = row.id ?? null;
    this.attEmpId = row.employeeId ?? null;
    this.attWork = row.workingDays ?? 0;
    this.attAbs = row.absentDays ?? 0;
    this.attHours = row.totalHoursWorked ?? 0;
    this.attOt = row.overtimeHours ?? 0;
    this.attLateH = row.lateDeductionHours ?? 0;
    this.attDialogOpen.set(true);
  }

  saveAtt(): void {
    const pid = this.selectedPeriodId();
    if (!pid || !this.attEmpId) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.att.validation'),
      });
      return;
    }
    const cmd: UpsertAttendanceSummaryCommand = {
      id: this.attEditId,
      employeeId: this.attEmpId,
      payrollPeriodId: pid,
      workingDays: this.attWork,
      absentDays: this.attAbs,
      totalHoursWorked: this.attHours,
      overtimeHours: this.attOt,
      lateDeductionHours: this.attLateH,
    };
    this.attApi.payrollAttendanceSummariesUpsert(cmd).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastOk('payroll.saved');
          this.attDialogOpen.set(false);
          this.refreshAtt();
        } else this.toastErr('payroll.save_failed', res.message);
      },
      error: () => this.toastErr('payroll.save_failed'),
    });
  }

  confirmAttDelete(event: Event, row: AttendanceSummaryDto): void {
    if (!row.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.att.confirm_delete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.attApi.payrollAttendanceSummariesDelete(row.id!).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastOk('payroll.deleted');
              this.refreshAtt();
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
