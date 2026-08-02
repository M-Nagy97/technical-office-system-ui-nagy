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
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TabViewModule } from 'primeng/tabview';
import { ToastModule } from 'primeng/toast';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  AllowanceCalcMethod,
  AllowanceTypeDto,
  CreateAllowanceTypeCommand,
  CreateDeductionTypeCommand,
  DeductionCalcMethod,
  DeductionTypeDto,
  PayrollAllowanceTypesService,
  PayrollDeductionTypesService,
  UpdateAllowanceTypeCommand,
  UpdateDeductionTypeCommand,
} from '../../../core/api/generated';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';

@Component({
  selector: 'app-payroll-lookups',
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
    InputNumberModule,
    InputSwitchModule,
    TabViewModule,
    ToastModule,
    ConfirmPopupModule,
    SharedTableComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './payroll-lookups.component.html',
  styleUrl: './payroll-lookups.component.scss',
})
export class PayrollLookupsComponent implements OnInit {
  private readonly deductionApi = inject(PayrollDeductionTypesService);
  private readonly allowanceApi = inject(PayrollAllowanceTypesService);
  private readonly messages = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly loadingDed = signal(false);
  readonly loadingAll = signal(false);
  readonly deductions = signal<DeductionTypeDto[]>([]);
  readonly allowances = signal<AllowanceTypeDto[]>([]);

  readonly dedDialog = signal(false);
  readonly allDialog = signal(false);
  readonly saving = signal(false);
  readonly dedEditingId = signal<string | null>(null);
  readonly allEditingId = signal<string | null>(null);

  dedFormName = '';
  dedFormMethod: DeductionCalcMethod = DeductionCalcMethod.NUMBER_0;
  dedFormValue = 0;
  dedFormActive = true;

  allFormName = '';
  allFormMethod: AllowanceCalcMethod = AllowanceCalcMethod.NUMBER_0;
  allFormValue = 0;
  allFormActive = true;

  dedMethodOptions: { label: string; value: DeductionCalcMethod }[] = [];
  allMethodOptions: { label: string; value: AllowanceCalcMethod }[] = [];

  readonly dedColumns: SharedTableColumn<DeductionTypeDto>[] = [
    { id: 'name', header: 'payroll.lookups.col_name', field: 'name' },
    {
      id: 'method',
      header: 'payroll.lookups.col_method',
      valueGetter: (r) => this.translate.instant(this.dedMethodKey(r.calcMethod)),
    },
    { id: 'value', header: 'payroll.lookups.col_value', valueGetter: (r) => r.value ?? '—' },
    {
      id: 'active',
      header: 'payroll.lookups.col_active',
      valueGetter: (r) => (r.isActive ? this.translate.instant('payroll.yes') : this.translate.instant('payroll.no')),
    },
  ];

  readonly allColumns: SharedTableColumn<AllowanceTypeDto>[] = [
    { id: 'name', header: 'payroll.lookups.col_name', field: 'name' },
    {
      id: 'method',
      header: 'payroll.lookups.col_method',
      valueGetter: (r) => this.translate.instant(this.allMethodKey(r.calcMethod)),
    },
    { id: 'value', header: 'payroll.lookups.col_value', valueGetter: (r) => r.value ?? '—' },
    {
      id: 'active',
      header: 'payroll.lookups.col_active',
      valueGetter: (r) => (r.isActive ? this.translate.instant('payroll.yes') : this.translate.instant('payroll.no')),
    },
  ];

  readonly dedActions: SharedTableAction<DeductionTypeDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openDedEdit(row),
    },
    {
      id: 'del',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmDedDelete(e, row),
    },
  ];

  readonly allActions: SharedTableAction<AllowanceTypeDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openAllEdit(row),
    },
    {
      id: 'del',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-danger p-button-text p-button-sm',
      onClick: (row, e) => this.confirmAllDelete(e, row),
    },
  ];

  ngOnInit(): void {
    this.rebuildMethodOptions();
    this.translate.onLangChange.subscribe(() => {
      this.rebuildMethodOptions();
      this.deductions.update((x) => [...x]);
      this.allowances.update((x) => [...x]);
    });
    this.loadDed();
    this.loadAll();
  }

  private rebuildMethodOptions(): void {
    this.dedMethodOptions = [
      { label: this.translate.instant('payroll.enums.deduction_method.fixed'), value: DeductionCalcMethod.NUMBER_0 },
      { label: this.translate.instant('payroll.enums.deduction_method.percentage'), value: DeductionCalcMethod.NUMBER_1 },
      { label: this.translate.instant('payroll.enums.deduction_method.per_day'), value: DeductionCalcMethod.NUMBER_2 },
      { label: this.translate.instant('payroll.enums.deduction_method.per_hour'), value: DeductionCalcMethod.NUMBER_3 },
    ];
    this.allMethodOptions = [
      { label: this.translate.instant('payroll.enums.allowance_method.fixed'), value: AllowanceCalcMethod.NUMBER_0 },
      { label: this.translate.instant('payroll.enums.allowance_method.percentage'), value: AllowanceCalcMethod.NUMBER_1 },
      { label: this.translate.instant('payroll.enums.allowance_method.per_day'), value: AllowanceCalcMethod.NUMBER_2 },
    ];
  }

  private dedMethodKey(v?: number | null): string {
    switch (v) {
      case 0:
        return 'payroll.enums.deduction_method.fixed';
      case 1:
        return 'payroll.enums.deduction_method.percentage';
      case 2:
        return 'payroll.enums.deduction_method.per_day';
      case 3:
        return 'payroll.enums.deduction_method.per_hour';
      default:
        return '—';
    }
  }

  private allMethodKey(v?: number | null): string {
    switch (v) {
      case 0:
        return 'payroll.enums.allowance_method.fixed';
      case 1:
        return 'payroll.enums.allowance_method.percentage';
      case 2:
        return 'payroll.enums.allowance_method.per_day';
      default:
        return '—';
    }
  }

  loadDed(): void {
    this.loadingDed.set(true);
    this.deductionApi.payrollDeductionTypesList().subscribe({
      next: (res) => {
        if (res.success && res.data) this.deductions.set(res.data);
        this.loadingDed.set(false);
      },
      error: () => {
        this.loadingDed.set(false);
        this.toastErr('payroll.load_failed');
      },
    });
  }

  loadAll(): void {
    this.loadingAll.set(true);
    this.allowanceApi.payrollAllowanceTypesList().subscribe({
      next: (res) => {
        if (res.success && res.data) this.allowances.set(res.data);
        this.loadingAll.set(false);
      },
      error: () => {
        this.loadingAll.set(false);
        this.toastErr('payroll.load_failed');
      },
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

  openDedCreate(): void {
    this.dedEditingId.set(null);
    this.dedFormName = '';
    this.dedFormMethod = DeductionCalcMethod.NUMBER_0;
    this.dedFormValue = 0;
    this.dedFormActive = true;
    this.dedDialog.set(true);
  }

  openDedEdit(row: DeductionTypeDto): void {
    if (!row.id) return;
    this.dedEditingId.set(row.id);
    this.dedFormName = row.name ?? '';
    this.dedFormMethod = (row.calcMethod ?? 0) as DeductionCalcMethod;
    this.dedFormValue = row.value ?? 0;
    this.dedFormActive = row.isActive ?? true;
    this.dedDialog.set(true);
  }

  saveDed(): void {
    if (!this.dedFormName.trim()) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.lookups.validation_name'),
      });
      return;
    }
    this.saving.set(true);
    const id = this.dedEditingId();
    if (id) {
      const cmd: UpdateDeductionTypeCommand = {
        id,
        name: this.dedFormName.trim(),
        calcMethod: this.dedFormMethod,
        value: this.dedFormValue,
        isActive: this.dedFormActive,
      };
      this.deductionApi.payrollDeductionTypesUpdate(id, cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastOk('payroll.saved');
            this.dedDialog.set(false);
            this.loadDed();
          } else this.toastErr('payroll.save_failed', res.message);
        },
        error: () => {
          this.saving.set(false);
          this.toastErr('payroll.save_failed');
        },
      });
    } else {
      const cmd: CreateDeductionTypeCommand = {
        name: this.dedFormName.trim(),
        calcMethod: this.dedFormMethod,
        value: this.dedFormValue,
        isActive: this.dedFormActive,
      };
      this.deductionApi.payrollDeductionTypesCreate(cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastOk('payroll.saved');
            this.dedDialog.set(false);
            this.loadDed();
          } else this.toastErr('payroll.save_failed', res.message);
        },
        error: () => {
          this.saving.set(false);
          this.toastErr('payroll.save_failed');
        },
      });
    }
  }

  confirmDedDelete(event: Event, row: DeductionTypeDto): void {
    if (!row.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.lookups.confirm_delete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.deductionApi.payrollDeductionTypesDelete(row.id!).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastOk('payroll.deleted');
              this.loadDed();
            } else this.toastErr('payroll.delete_failed', res.message);
          },
          error: () => this.toastErr('payroll.delete_failed'),
        }),
    });
  }

  openAllCreate(): void {
    this.allEditingId.set(null);
    this.allFormName = '';
    this.allFormMethod = AllowanceCalcMethod.NUMBER_0;
    this.allFormValue = 0;
    this.allFormActive = true;
    this.allDialog.set(true);
  }

  openAllEdit(row: AllowanceTypeDto): void {
    if (!row.id) return;
    this.allEditingId.set(row.id);
    this.allFormName = row.name ?? '';
    this.allFormMethod = (row.calcMethod ?? 0) as AllowanceCalcMethod;
    this.allFormValue = row.value ?? 0;
    this.allFormActive = row.isActive ?? true;
    this.allDialog.set(true);
  }

  saveAll(): void {
    if (!this.allFormName.trim()) {
      this.messages.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('payroll.lookups.validation_name'),
      });
      return;
    }
    this.saving.set(true);
    const id = this.allEditingId();
    if (id) {
      const cmd: UpdateAllowanceTypeCommand = {
        id,
        name: this.allFormName.trim(),
        calcMethod: this.allFormMethod,
        value: this.allFormValue,
        isActive: this.allFormActive,
      };
      this.allowanceApi.payrollAllowanceTypesUpdate(id, cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastOk('payroll.saved');
            this.allDialog.set(false);
            this.loadAll();
          } else this.toastErr('payroll.save_failed', res.message);
        },
        error: () => {
          this.saving.set(false);
          this.toastErr('payroll.save_failed');
        },
      });
    } else {
      const cmd: CreateAllowanceTypeCommand = {
        name: this.allFormName.trim(),
        calcMethod: this.allFormMethod,
        value: this.allFormValue,
        isActive: this.allFormActive,
      };
      this.allowanceApi.payrollAllowanceTypesCreate(cmd).subscribe({
        next: (res) => {
          this.saving.set(false);
          if (res.success) {
            this.toastOk('payroll.saved');
            this.allDialog.set(false);
            this.loadAll();
          } else this.toastErr('payroll.save_failed', res.message);
        },
        error: () => {
          this.saving.set(false);
          this.toastErr('payroll.save_failed');
        },
      });
    }
  }

  confirmAllDelete(event: Event, row: AllowanceTypeDto): void {
    if (!row.id) return;
    this.confirm.confirm({
      target: event.target as EventTarget,
      message: this.translate.instant('payroll.lookups.confirm_delete'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.allowanceApi.payrollAllowanceTypesDelete(row.id!).subscribe({
          next: (res) => {
            if (res.success) {
              this.toastOk('payroll.deleted');
              this.loadAll();
            } else this.toastErr('payroll.delete_failed', res.message);
          },
          error: () => this.toastErr('payroll.delete_failed'),
        }),
    });
  }
}
