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
  CreatePayrollPeriodCommand,
  PayrollPeriodDto,
  PayrollPeriodsService,
  PayrollPeriodStatus,
  UpdatePayrollPeriodCommand,
} from '../../../core/api/generated';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { datetimeLocalToIso, isoToDatetimeLocal } from '../utils/payroll-forms';

@Component({
  selector: 'app-payroll-periods',
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
  templateUrl: './payroll-periods.component.html',
  styleUrl: './payroll-periods.component.scss',
})
export class PayrollPeriodsComponent implements OnInit {
  private readonly api = inject(PayrollPeriodsService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly rows = signal<PayrollPeriodDto[]>([]);
  readonly dialogVisible = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);

  formName = '';
  formStart = '';
  formEnd = '';
  formStatus: PayrollPeriodStatus = PayrollPeriodStatus.NUMBER_0;
  formProcessedLocal = '';

  statusOptions: { label: string; value: PayrollPeriodStatus }[] = [];

  readonly columns: SharedTableColumn<PayrollPeriodDto>[] = [
    { id: 'name', header: 'payroll.periods.col_name', field: 'periodName' },
    { id: 'start', header: 'payroll.periods.col_start', valueGetter: (r) => r.startDate ?? '—' },
    { id: 'end', header: 'payroll.periods.col_end', valueGetter: (r) => r.endDate ?? '—' },
    {
      id: 'status',
      header: 'payroll.periods.col_status',
      valueGetter: (r) => this.translate.instant(this.periodStatusKey(r.status)),
    },
    {
      id: 'processed',
      header: 'payroll.periods.col_processed',
      valueGetter: (r) => (r.processedDate ? new Date(r.processedDate).toLocaleString() : '—'),
    },
  ];

  readonly actions: SharedTableAction<PayrollPeriodDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openEdit(row),
    },
    {
      id: 'delete',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmDelete(e, row),
    },
  ];

  ngOnInit(): void {
    this.rebuildStatusOptions();
    this.translate.onLangChange.subscribe(() => this.rebuildStatusOptions());
    this.load();
  }

  private rebuildStatusOptions(): void {
    this.statusOptions = [
      { label: this.translate.instant('payroll.enums.period_status.open'), value: PayrollPeriodStatus.NUMBER_0 },
      { label: this.translate.instant('payroll.enums.period_status.processing'), value: PayrollPeriodStatus.NUMBER_1 },
      { label: this.translate.instant('payroll.enums.period_status.closed'), value: PayrollPeriodStatus.NUMBER_2 },
    ];
  }

  load(): void {
    this.loading.set(true);
    this.api.payrollPeriodsList().subscribe({
      next: (res) => {
        if (res.success && res.data) this.rows.set(res.data);
        else
          this.messages.add({
            severity: 'warn',
            summary: this.translate.instant('common.warning'),
            detail: res.message ?? this.translate.instant('payroll.load_failed'),
          });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: this.translate.instant('payroll.load_failed'),
        });
      },
    });
  }

  private periodStatusKey(v?: number | null): string {
    switch (v) {
      case 0:
        return 'payroll.enums.period_status.open';
      case 1:
        return 'payroll.enums.period_status.processing';
      case 2:
        return 'payroll.enums.period_status.closed';
      default:
        return '—';
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formName = '';
    this.formStart = '';
    this.formEnd = '';
    this.formStatus = PayrollPeriodStatus.NUMBER_0;
    this.formProcessedLocal = '';
    this.dialogVisible.set(true);
  }

  openEdit(row: PayrollPeriodDto): void {
    if (!row.id) return;
    this.editingId.set(row.id);
    this.formName = row.periodName ?? '';
    this.formStart = row.startDate?.slice(0, 10) ?? '';
    this.formEnd = row.endDate?.slice(0, 10) ?? '';
    this.formStatus = (row.status ?? 0) as PayrollPeriodStatus;
    this.formProcessedLocal = isoToDatetimeLocal(row.processedDate ?? undefined);
    this.dialogVisible.set(true);
  }

  save(): void {
    const start = this.formStart;
    const end = this.formEnd;
    if (!this.formName.trim() || !start || !end) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.periods.validation_required'),
      });
      return;
    }
    this.saving.set(true);
    const id = this.editingId();
    if (id) {
      const cmd: UpdatePayrollPeriodCommand = {
        id,
        periodName: this.formName.trim(),
        startDate: start,
        endDate: end,
        status: this.formStatus,
        processedDate: datetimeLocalToIso(this.formProcessedLocal),
      };
      this.api.payrollPeriodsUpdate(id, cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.messages.add({
              severity: 'success',
              summary: this.translate.instant('common.success'),
              detail: this.translate.instant('payroll.saved'),
            });
            this.dialogVisible.set(false);
            this.load();
          } else
            this.messages.add({
              severity: 'error',
              summary: this.translate.instant('common.error'),
              detail: res.message ?? '',
            });
        },
        error: () => {
          this.saving.set(false);
          this.messages.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: this.translate.instant('payroll.save_failed'),
          });
        },
      });
    } else {
      const cmd: CreatePayrollPeriodCommand = {
        periodName: this.formName.trim(),
        startDate: start,
        endDate: end,
        status: this.formStatus,
      };
      this.api.payrollPeriodsCreate(cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.messages.add({
              severity: 'success',
              summary: this.translate.instant('common.success'),
              detail: this.translate.instant('payroll.saved'),
            });
            this.dialogVisible.set(false);
            this.load();
          } else
            this.messages.add({
              severity: 'error',
              summary: this.translate.instant('common.error'),
              detail: res.message ?? '',
            });
        },
        error: () => {
          this.saving.set(false);
          this.messages.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: this.translate.instant('payroll.save_failed'),
          });
        },
      });
    }
  }

  confirmDelete(event: Event, row: PayrollPeriodDto): void {
    if (!row.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.periods.confirm_delete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row.id!),
    });
  }

  delete(id: string): void {
    this.api.payrollPeriodsDelete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.messages.add({
            severity: 'success',
            summary: this.translate.instant('common.success'),
            detail: this.translate.instant('payroll.deleted'),
          });
          this.load();
        } else
          this.messages.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: res.message ?? '',
          });
      },
      error: () =>
        this.messages.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: this.translate.instant('payroll.delete_failed'),
        }),
    });
  }
}
