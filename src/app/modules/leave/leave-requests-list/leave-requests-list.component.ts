import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  SharedTableComponent,
  SharedTableColumn,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  StatusBadgeComponent,
} from '../../../shared';
import {
  LeaveRequestService,
  LeaveTypeService,
  EmployeeService,
  LanguageService,
} from '../../../core/services';
import {
  LeaveRequestDto,
  LeaveRequestStatus,
  LeaveRequestFilter,
} from '../../../core/models/leave-request.model';
import { LeaveTypeDto } from '../../../core/services/leave-type.service';
import { Employee } from '../../../core/models/employee.model';
import {
  LeaveActionDialogComponent,
  LeaveActionEvent,
  LeaveActionType,
} from '../leave-action-dialog/leave-action-dialog.component';

@Component({
  selector: 'app-leave-requests-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    TagModule,
    TooltipModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    StatusBadgeComponent,
    LeaveActionDialogComponent,
    TranslateModule,
  ],
  templateUrl: './leave-requests-list.component.html',
  styleUrl: './leave-requests-list.component.scss',
})
export class LeaveRequestsListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly leaveTypeService = inject(LeaveTypeService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  private readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly requests = signal<LeaveRequestDto[]>([]);
  readonly leaveTypes = signal<LeaveTypeDto[]>([]);
  readonly employees = signal<Employee[]>([]);

  // Filter signals
  readonly selectedEmployeeId = signal<string | null>(null);
  readonly selectedLeaveTypeId = signal<string | null>(null);
  readonly selectedStatus = signal<number | null>(null);
  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);

  // Dialog signals
  readonly actionDialogOpen = signal(false);
  readonly currentAction = signal<LeaveActionType | null>(null);
  readonly currentRequestId = signal('');
  readonly currentRequestWarnings = signal<string | null>(null);
  readonly actionLoading = signal(false);

  readonly statusOptions = computed(() => [
    { label: this.translate.instant('leave.status.all'), value: null },
    { label: this.translate.instant('leave.status.draft'), value: LeaveRequestStatus.Draft },
    { label: this.translate.instant('leave.status.pending'), value: LeaveRequestStatus.Pending },
    { label: this.translate.instant('leave.status.approved'), value: LeaveRequestStatus.Approved },
    { label: this.translate.instant('leave.status.rejected'), value: LeaveRequestStatus.Rejected },
    { label: this.translate.instant('leave.status.cancelled'), value: LeaveRequestStatus.Cancelled },
  ]);

  readonly leaveTypeOptionLabel = computed(() =>
    this.languageService.currentLang() === 'en' ? 'name' : 'arabicName'
  );

  readonly employeeMap = computed(() => {
    const map = new Map<string, string>();
    for (const emp of this.employees()) {
      map.set(emp.id, emp.fullName);
    }
    return map;
  });

  readonly columns: SharedTableColumn<LeaveRequestDto>[] = [
    {
      id: 'employee',
      header: 'leave.requests.col_employee',
      width: '20%',
      valueGetter: (row) => row.employeeName || this.employeeMap().get(row.employeeId) || row.employeeId,
    },
    {
      id: 'leaveType',
      header: 'leave.requests.col_type',
      width: '18%',
      valueGetter: (row) =>
        this.languageService.currentLang() === 'en'
          ? row.leaveTypeName || row.leaveTypeArabicName || '-'
          : row.leaveTypeArabicName || row.leaveTypeName || '-',
    },
    {
      id: 'startDate',
      header: 'leave.requests.col_from',
      field: 'startDate',
      sortableField: 'startDate',
      width: '13%',
      valueGetter: (row) => row.startDate,
    },
    {
      id: 'endDate',
      header: 'leave.requests.col_to',
      field: 'endDate',
      sortableField: 'endDate',
      width: '13%',
      valueGetter: (row) => row.endDate,
    },
    {
      id: 'totalDays',
      header: 'leave.requests.col_days',
      field: 'totalDays',
      sortableField: 'totalDays',
      width: '10%',
      valueGetter: (row) => this.translate.instant('leave.requests.days_count', { count: row.totalDays }),
    },
    {
      id: 'status',
      header: 'leave.requests.col_status',
      width: '14%',
    },
  ];

  readonly actions: SharedTableAction<LeaveRequestDto>[] = [
    {
      id: 'view',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-info',
      onClick: (row) => {
        this.router.navigate(['/leave/requests', row.id]);
      },
    },
    {
      id: 'approve',
      icon: 'pi pi-check',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-success',
      visible: (row) => row.status === LeaveRequestStatus.Pending,
      onClick: (row) => {
        this.openActionDialog('approve', row);
      },
    },
    {
      id: 'reject',
      icon: 'pi pi-times',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-danger',
      visible: (row) => row.status === LeaveRequestStatus.Pending,
      onClick: (row) => {
        this.openActionDialog('reject', row);
      },
    },
    {
      id: 'cancel',
      icon: 'pi pi-ban',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-secondary',
      visible: (row) =>
        row.status === LeaveRequestStatus.Pending || row.status === LeaveRequestStatus.Approved,
      onClick: (row) => {
        this.openActionDialog('cancel', row);
      },
    },
  ];

  ngOnInit(): void {
    this.loadEmployees();
    this.loadLeaveTypes();
    this.loadRequests();
  }

  loadEmployees(): void {
    this.employeeService.fetchAll().subscribe({
      next: (emps) => this.employees.set(emps || []),
      error: () => this.employees.set(this.employeeService.getList()),
    });
  }

  loadLeaveTypes(): void {
    this.leaveTypeService.getAll().subscribe({
      next: (types) => this.leaveTypes.set(types || []),
      error: () => {},
    });
  }

  loadRequests(): void {
    this.loading.set(true);

    const filter: LeaveRequestFilter = {};
    if (this.selectedEmployeeId()) filter.employeeId = this.selectedEmployeeId()!;
    if (this.selectedLeaveTypeId()) filter.leaveTypeId = this.selectedLeaveTypeId()!;
    if (this.selectedStatus() !== null && this.selectedStatus() !== undefined) {
      filter.status = this.selectedStatus()!;
    }
    if (this.fromDate()) {
      filter.fromDate = this.formatDate(this.fromDate()!);
    }
    if (this.toDate()) {
      filter.toDate = this.formatDate(this.toDate()!);
    }

    this.leaveRequestService.getAll(filter).subscribe({
      next: (data) => {
        this.requests.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  resetFilters(): void {
    this.selectedEmployeeId.set(null);
    this.selectedLeaveTypeId.set(null);
    this.selectedStatus.set(null);
    this.fromDate.set(null);
    this.toDate.set(null);
    this.loadRequests();
  }

  getWarningText(row: LeaveRequestDto): string {
    if (this.languageService.currentLang() === 'ar') {
      return row.warningAlertsAr || row.warningAlerts || '';
    }
    return row.warningAlerts || row.warningAlertsAr || '';
  }

  openActionDialog(action: LeaveActionType, request: LeaveRequestDto | string): void {
    const id = typeof request === 'string' ? request : request.id;
    const req = typeof request === 'string' ? this.requests().find((r) => r.id === id) : request;
    const warnings = req ? this.getWarningText(req) : null;

    this.currentAction.set(action);
    this.currentRequestId.set(id);
    this.currentRequestWarnings.set(warnings);
    this.actionDialogOpen.set(true);
  }

  handleActionConfirm(event: LeaveActionEvent): void {
    this.actionLoading.set(true);

    let op$;
    if (event.action === 'approve') {
      op$ = this.leaveRequestService.approve(event.requestId);
    } else if (event.action === 'reject') {
      op$ = this.leaveRequestService.reject(event.requestId, event.reason || '');
    } else {
      op$ = this.leaveRequestService.cancel(event.requestId, event.reason);
    }

    op$.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.actionDialogOpen.set(false);
        const detailMsg =
          event.action === 'approve'
            ? this.translate.instant('leave.actions.approve_leave_success')
            : event.action === 'reject'
            ? this.translate.instant('leave.actions.reject_leave_success')
            : this.translate.instant('leave.actions.cancel_leave_success');

        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('common.success'),
          detail: detailMsg,
        });
        this.loadRequests();
      },
      error: () => {
        this.actionLoading.set(false);
      },
    });
  }

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

