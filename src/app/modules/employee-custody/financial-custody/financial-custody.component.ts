import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { MessageService } from 'primeng/api';
import { CustodyApiService } from '../../../core/services/custody-api.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import {
  CustodyTransactionType,
  EmployeeCustodyDetailsDto,
} from '../../../core/models/custody.models';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-financial-custody',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    DropdownModule,
    TableModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    CalendarModule,
  ],
  templateUrl: './financial-custody.component.html',
  styleUrl: './financial-custody.component.scss',
})
export class FinancialCustodyComponent implements OnInit {
  private readonly custodyApi = inject(CustodyApiService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  readonly employees = signal<Employee[]>([]);
  selectedEmployeeId: string | null = null;
  readonly loading = signal(false);
  readonly details = signal<EmployeeCustodyDetailsDto | null>(null);
  dialogVisible = false;
  returnDialogVisible = false;

  txType: CustodyTransactionType = CustodyTransactionType.Give;
  txAmount: number | null = null;
  txDate: Date = new Date();
  txNotes = '';
  txAttachment = '';

  returnAmount: number | null = null;
  returnDate: Date = new Date();
  returnNotes = '';
  returnAttachment = '';

  typeOptions: { label: string; value: CustodyTransactionType }[] = [];

  readonly employeeOptions = computed(() =>
    this.employees().map((e) => ({ label: `${e.employeeNumber} — ${e.fullName}`, value: e.id }))
  );

  readonly CustodyTransactionType = CustodyTransactionType;

  ngOnInit(): void {
    this.refreshTypeOptions();
    this.translate.onLangChange.subscribe(() => this.refreshTypeOptions());

    this.employeeService.fetchAll().subscribe({
      next: (list) => this.employees.set(list),
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load employees',
        }),
    });
  }

  private refreshTypeOptions(): void {
    this.typeOptions = [
      { label: this.translate.instant('custody.tx_type.give'), value: CustodyTransactionType.Give },
      { label: this.translate.instant('custody.tx_type.spend'), value: CustodyTransactionType.Spend },
      { label: this.translate.instant('custody.tx_type.return'), value: CustodyTransactionType.Return },
    ];
  }

  employeeLabel(id: string | null | undefined): string {
    if (!id) return '—';
    const e = this.employees().find((x) => x.id === id);
    return e ? `${e.employeeNumber} — ${e.fullName}` : id;
  }

  loadDetails(): void {
    const id = this.selectedEmployeeId;
    if (!id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: this.translate.instant('custody.select_employee_first'),
      });
      return;
    }
    this.loading.set(true);
    this.custodyApi
      .getEmployeeDetails(id)
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((err: Error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err.message,
          });
          return of(null);
        })
      )
      .subscribe((d) => this.details.set(d));
  }

  openTxDialog(): void {
    this.txType = CustodyTransactionType.Give;
    this.txAmount = null;
    this.txDate = new Date();
    this.txNotes = '';
    this.txAttachment = '';
    this.dialogVisible = true;
  }

  openReturnDialog(): void {
    this.returnAmount = null;
    this.returnDate = new Date();
    this.returnNotes = '';
    this.returnAttachment = '';
    this.returnDialogVisible = true;
  }

  submitTransaction(): void {
    const empId = this.selectedEmployeeId;
    if (!empId || this.txAmount == null || this.txAmount <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: this.translate.instant('custody.validation_amount'),
      });
      return;
    }
    this.loading.set(true);
    this.custodyApi
      .createTransaction({
        employeeId: empId,
        amount: this.txAmount,
        type: this.txType,
        transactionDate: this.txDate.toISOString(),
        notes: this.txNotes || null,
        attachmentUrl: this.txAttachment || null,
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          return of(null);
        })
      )
      .subscribe((id) => {
        if (id) {
          this.messageService.add({ severity: 'success', summary: 'OK', detail: id });
          this.dialogVisible = false;
          this.loadDetails();
        }
      });
  }

  submitReturn(): void {
    const empId = this.selectedEmployeeId;
    if (!empId || this.returnAmount == null || this.returnAmount <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: this.translate.instant('custody.validation_amount'),
      });
      return;
    }
    this.loading.set(true);
    this.custodyApi
      .returnAmount({
        employeeId: empId,
        amount: this.returnAmount,
        transactionDate: this.returnDate.toISOString(),
        notes: this.returnNotes || null,
        attachmentUrl: this.returnAttachment || null,
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          return of(null);
        })
      )
      .subscribe((id) => {
        if (id) {
          this.messageService.add({ severity: 'success', summary: 'OK', detail: id });
          this.returnDialogVisible = false;
          this.loadDetails();
        }
      });
  }

  txTypeLabel(type: CustodyTransactionType): string {
    const map: Record<CustodyTransactionType, string> = {
      [CustodyTransactionType.Give]: 'custody.tx_type.give',
      [CustodyTransactionType.Spend]: 'custody.tx_type.spend',
      [CustodyTransactionType.Return]: 'custody.tx_type.return',
    };
    return map[type] ?? String(type);
  }
}
