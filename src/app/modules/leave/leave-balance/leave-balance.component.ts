import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LeaveBalanceService, LeaveTypeService, EmployeeService, LanguageService } from '../../../core/services';
import { EmployeeLeaveBalanceDto } from '../../../core/models/leave-balance.model';
import { LeaveTypeDto } from '../../../core/services/leave-type.service';
import { Employee } from '../../../core/models/employee.model';

@Component({
  selector: 'app-leave-balance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    ProgressBarModule,
    DialogModule,
    ConfirmDialogModule,
    InputNumberModule,
    TagModule,
    TooltipModule,
    TranslateModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './leave-balance.component.html',
  styleUrl: './leave-balance.component.scss',
})
export class LeaveBalanceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly leaveBalanceService = inject(LeaveBalanceService);
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly balances = signal<EmployeeLeaveBalanceDto[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly leaveTypes = signal<LeaveTypeDto[]>([]);

  readonly selectedEmployeeId = signal<string | null>(null);
  readonly selectedYear = signal<number>(new Date().getFullYear());

  // Init dialog signals
  readonly initDialogOpen = signal(false);
  readonly initSaving = signal(false);
  initForm!: FormGroup;

  readonly yearOptions = computed(() => {
    const current = new Date().getFullYear();
    return [
      { label: String(current - 1), value: current - 1 },
      { label: String(current), value: current },
      { label: String(current + 1), value: current + 1 },
      { label: String(current + 2), value: current + 2 },
    ];
  });

  readonly selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    if (!id) return null;
    return this.employees().find((e) => e.id === id) ?? null;
  });

  readonly leaveTypeOptionLabel = computed(() =>
    this.languageService.currentLang() === 'en' ? 'name' : 'arabicName'
  );

  ngOnInit(): void {
    this.buildInitForm();
    this.loadEmployees();
    this.loadLeaveTypes();
  }

  private buildInitForm(): void {
    this.initForm = this.fb.group({
      employeeId: ['', [Validators.required]],
      leaveTypeId: ['', [Validators.required]],
      year: [this.selectedYear(), [Validators.required]],
      allowedDays: [30, [Validators.required, Validators.min(1)]],
    });
  }

  loadEmployees(): void {
    this.employeeService.fetchAll().subscribe({
      next: (emps) => {
        this.employees.set(emps || []);
        if (emps && emps.length > 0 && !this.selectedEmployeeId()) {
          this.selectedEmployeeId.set(emps[0].id);
          this.loadBalances();
        }
      },
      error: () => {
        const list = this.employeeService.getList();
        this.employees.set(list);
        if (list.length > 0 && !this.selectedEmployeeId()) {
          this.selectedEmployeeId.set(list[0].id);
          this.loadBalances();
        }
      },
    });
  }

  loadLeaveTypes(): void {
    this.leaveTypeService.getAll().subscribe({
      next: (types) => this.leaveTypes.set(types || []),
    });
  }

  loadBalances(): void {
    const empId = this.selectedEmployeeId();
    if (!empId) {
      this.balances.set([]);
      return;
    }

    this.loading.set(true);
    this.leaveBalanceService.getByEmployee(empId, this.selectedYear()).subscribe({
      next: (data) => {
        this.balances.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('common.error'),
          detail: this.translate.instant('leave.balances.load_failed'),
        });
      },
    });
  }

  onEmployeeChange(empId: string | null): void {
    this.selectedEmployeeId.set(empId);
    if (empId) {
      this.loadBalances();
    } else {
      this.balances.set([]);
    }
  }

  onYearChange(year: number): void {
    this.selectedYear.set(year);
    if (this.selectedEmployeeId()) {
      this.loadBalances();
    }
  }

  getUsagePercent(item: EmployeeLeaveBalanceDto): number {
    if (!item.allowedDays || item.allowedDays <= 0) return 0;
    const pct = Math.round((item.usedDays / item.allowedDays) * 100);
    return Math.min(100, Math.max(0, pct));
  }

  openInitDialog(): void {
    this.initForm.patchValue({
      employeeId: this.selectedEmployeeId() || '',
      year: this.selectedYear(),
      allowedDays: 30,
      leaveTypeId: this.leaveTypes().length > 0 ? this.leaveTypes()[0].id : '',
    });
    this.initDialogOpen.set(true);
  }

  submitInit(): void {
    if (this.initForm.invalid) {
      this.initForm.markAllAsTouched();
      return;
    }

    this.initSaving.set(true);
    const val = this.initForm.value;

    this.leaveBalanceService
      .initialise(val.employeeId, val.leaveTypeId, Number(val.year), Number(val.allowedDays))
      .subscribe({
        next: () => {
          this.initSaving.set(false);
          this.initDialogOpen.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success'),
            detail: this.translate.instant('leave.balances.init_success'),
          });
          if (val.employeeId === this.selectedEmployeeId() && Number(val.year) === this.selectedYear()) {
            this.loadBalances();
          }
        },
        error: (err) => {
          this.initSaving.set(false);
          const isAr = this.languageService.currentLang() === 'ar';
          const msg =
            (isAr ? err?.error?.messageAr : err?.error?.message) ||
            err?.error?.message ||
            err?.error?.messageAr ||
            err?.error?.detail ||
            this.translate.instant('leave.balances.init_failed');

          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: msg,
          });
        },
      });
  }

  deleteBalance(balance: EmployeeLeaveBalanceDto): void {
    if (balance.usedDays > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('leave.balances.cannot_delete_warn'),
      });
      return;
    }

    const typeName =
      this.languageService.currentLang() === 'en'
        ? balance.leaveTypeName || balance.leaveTypeArabicName
        : balance.leaveTypeArabicName || balance.leaveTypeName;

    this.confirmationService.confirm({
      message: this.translate.instant('leave.balances.delete_confirm_msg', {
        name: typeName,
        year: balance.year,
      }),
      header: this.translate.instant('leave.balances.delete_confirm_title'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.leaveBalanceService.deleteBalance(balance.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('common.success'),
              detail: this.translate.instant('leave.balances.delete_success'),
            });
            this.loadBalances();
          },
          error: (err) => {
            const isAr = this.languageService.currentLang() === 'ar';
            const msg =
              (isAr ? err?.error?.messageAr : err?.error?.message) ||
              err?.error?.message ||
              err?.error?.messageAr ||
              err?.error?.detail ||
              this.translate.instant('leave.balances.delete_failed');

            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('common.error'),
              detail: msg,
            });
          },
        });
      },
    });
  }
}


