import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
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
} from '../../../../shared';
import { PermissionRequestService, EmployeeService, LanguageService } from '../../../../core/services';
import {
  PermissionRequestDto,
  PermissionRequestStatus,
  PermissionDurationType,
  HalfDayPeriod,
  PermissionRequestFilter,
} from '../../../../core/models/permission-request.model';
import { Employee } from '../../../../core/models/employee.model';
import {
  RequestActionDialogComponent,
  RequestActionEvent,
  RequestActionType,
} from '../../shared/request-action-dialog/request-action-dialog.component';

@Component({
  selector: 'app-permission-requests-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    TagModule,
    TooltipModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    StatusBadgeComponent,
    RequestActionDialogComponent,
    TranslateModule,
  ],
  templateUrl: './permission-requests-list.component.html',
  styleUrl: './permission-requests-list.component.scss',
})
export class PermissionRequestsListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly permissionRequestService = inject(PermissionRequestService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly loading = signal(false);
  readonly requests = signal<PermissionRequestDto[]>([]);
  readonly employees = signal<Employee[]>([]);

  // Filter signals
  readonly selectedEmployeeId = signal<string | null>(null);
  readonly selectedStatus = signal<number | null>(null);
  readonly fromDate = signal<Date | null>(null);
  readonly toDate = signal<Date | null>(null);

  // Dialog signals
  readonly actionDialogOpen = signal(false);
  readonly currentAction = signal<RequestActionType | null>(null);
  readonly currentRequestId = signal('');
  readonly currentRequestWarnings = signal<string | null>(null);
  readonly actionLoading = signal(false);

  readonly statusOptions = computed(() => [
    { label: this.translate.instant('leave.status.all'), value: null },
    { label: this.translate.instant('leave.status.pending'), value: PermissionRequestStatus.Pending },
    { label: this.translate.instant('leave.status.approved'), value: PermissionRequestStatus.Approved },
    { label: this.translate.instant('leave.status.rejected'), value: PermissionRequestStatus.Rejected },
    { label: this.translate.instant('leave.status.cancelled'), value: PermissionRequestStatus.Cancelled },
  ]);

  readonly employeeMap = computed(() => {
    const map = new Map<string, string>();
    for (const emp of this.employees()) {
      map.set(emp.id, emp.fullName);
    }
    return map;
  });

  readonly columns: SharedTableColumn<PermissionRequestDto>[] = [
    {
      id: 'employee',
      header: 'leave.permissions.col_employee',
      width: '22%',
      valueGetter: (row) => row.employeeName || this.employeeMap().get(row.employeeId) || row.employeeId,
    },
    {
      id: 'date',
      header: 'leave.permissions.col_date',
      field: 'date',
      sortableField: 'date',
      width: '14%',
      valueGetter: (row) => row.date,
    },
    {
      id: 'durationType',
      header: 'leave.permissions.col_duration_type',
      width: '15%',
      valueGetter: (row) =>
        row.durationType === PermissionDurationType.HalfDay
          ? this.translate.instant('leave.permissions.duration_half_day')
          : this.translate.instant('leave.permissions.duration_custom_time'),
    },
    {
      id: 'details',
      header: 'leave.permissions.col_details',
      width: '20%',
      valueGetter: (row) => {
        if (row.durationType === PermissionDurationType.HalfDay) {
          return row.halfDayPeriod === HalfDayPeriod.Afternoon
            ? this.translate.instant('leave.permissions.period_afternoon')
            : this.translate.instant('leave.permissions.period_morning');
        }
        return this.translate.instant('leave.permissions.time_range', {
          from: row.fromTime || '--',
          to: row.toTime || '--',
        });
      },
    },
    {
      id: 'status',
      header: 'leave.permissions.col_status',
      width: '14%',
    },
  ];

  readonly actions: SharedTableAction<PermissionRequestDto>[] = [
    {
      id: 'view',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-info',
      onClick: (row) => {
        this.router.navigate(['/leave/permissions', row.id]);
      },
    },
    {
      id: 'approve',
      icon: 'pi pi-check',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-success',
      visible: (row) => row.status === PermissionRequestStatus.Pending,
      onClick: (row) => {
        this.openActionDialog('approve', row);
      },
    },
    {
      id: 'reject',
      icon: 'pi pi-times',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-danger',
      visible: (row) => row.status === PermissionRequestStatus.Pending,
      onClick: (row) => {
        this.openActionDialog('reject', row);
      },
    },
    {
      id: 'cancel',
      icon: 'pi pi-ban',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-secondary',
      visible: (row) =>
        row.status === PermissionRequestStatus.Pending ||
        row.status === PermissionRequestStatus.Approved,
      onClick: (row) => {
        this.openActionDialog('cancel', row);
      },
    },
  ];

  ngOnInit(): void {
    this.loadEmployees();
    this.loadRequests();
  }

  loadEmployees(): void {
    this.employeeService.fetchAll().subscribe({
      next: (emps) => this.employees.set(emps || []),
      error: () => this.employees.set(this.employeeService.getList()),
    });
  }

  loadRequests(): void {
    this.loading.set(true);

    const filter: PermissionRequestFilter = {};
    if (this.selectedEmployeeId()) filter.employeeId = this.selectedEmployeeId()!;
    if (this.selectedStatus() !== null && this.selectedStatus() !== undefined) {
      filter.status = this.selectedStatus()!;
    }
    if (this.fromDate()) {
      filter.fromDate = this.formatDate(this.fromDate()!);
    }
    if (this.toDate()) {
      filter.toDate = this.formatDate(this.toDate()!);
    }

    this.permissionRequestService.getAll(filter).subscribe({
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
    this.selectedStatus.set(null);
    this.fromDate.set(null);
    this.toDate.set(null);
    this.loadRequests();
  }

  getWarningText(row: PermissionRequestDto): string {
    if (this.languageService.currentLang() === 'ar') {
      return row.warningAlertsAr || row.warningAlerts || '';
    }
    return row.warningAlerts || row.warningAlertsAr || '';
  }

  openActionDialog(action: RequestActionType, request: PermissionRequestDto | string): void {
    const id = typeof request === 'string' ? request : request.id;
    const req = typeof request === 'string' ? this.requests().find((r) => r.id === id) : request;
    const warnings = req ? this.getWarningText(req) : null;

    this.currentAction.set(action);
    this.currentRequestId.set(id);
    this.currentRequestWarnings.set(warnings);
    this.actionDialogOpen.set(true);
  }

  handleActionConfirm(event: RequestActionEvent): void {
    this.actionLoading.set(true);

    let op$;
    if (event.action === 'approve') {
      op$ = this.permissionRequestService.approve(event.requestId);
    } else if (event.action === 'reject') {
      op$ = this.permissionRequestService.reject(event.requestId, event.reason || '');
    } else {
      op$ = this.permissionRequestService.cancel(event.requestId, event.reason);
    }

    op$.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.actionDialogOpen.set(false);
        const detailMsg =
          event.action === 'approve'
            ? this.translate.instant('leave.actions.approve_permission_success')
            : event.action === 'reject'
            ? this.translate.instant('leave.actions.reject_permission_success')
            : this.translate.instant('leave.actions.cancel_permission_success');

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

