import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { MessageService } from 'primeng/api';
import {
  SharedTableComponent,
  SharedTableColumn,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  StatusBadgeComponent,
} from '../../../shared';
import { PermissionRequestService, EmployeeService } from '../../../core/services';
import {
  PermissionRequestDto,
  PermissionRequestStatus,
  PermissionDurationType,
  HalfDayPeriod,
  PermissionRequestFilter,
} from '../../../core/models/permission-request.model';
import { Employee } from '../../../core/models/employee.model';
import {
  PermissionActionDialogComponent,
  PermissionActionEvent,
  PermissionActionType,
} from '../permission-action-dialog/permission-action-dialog.component';

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
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    StatusBadgeComponent,
    PermissionActionDialogComponent,
  ],
  templateUrl: './permission-requests-list.component.html',
  styleUrl: './permission-requests-list.component.scss',
})
export class PermissionRequestsListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly permissionRequestService = inject(PermissionRequestService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);

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
  readonly currentAction = signal<PermissionActionType | null>(null);
  readonly currentRequestId = signal('');
  readonly actionLoading = signal(false);

  readonly statusOptions = [
    { label: 'الكل', value: null },
    { label: 'قيد الانتظار', value: PermissionRequestStatus.Pending },
    { label: 'موافق عليه', value: PermissionRequestStatus.Approved },
    { label: 'مرفوض', value: PermissionRequestStatus.Rejected },
    { label: 'ملغي', value: PermissionRequestStatus.Cancelled },
  ];

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
      header: 'الموظف',
      width: '22%',
      valueGetter: (row) => row.employeeName || this.employeeMap().get(row.employeeId) || row.employeeId,
    },
    {
      id: 'date',
      header: 'التاريخ',
      field: 'date',
      sortableField: 'date',
      width: '14%',
      valueGetter: (row) => row.date,
    },
    {
      id: 'durationType',
      header: 'نوع المدة',
      width: '15%',
      valueGetter: (row) =>
        row.durationType === PermissionDurationType.HalfDay ? 'نصف يوم' : 'نطاق زمني',
    },
    {
      id: 'details',
      header: 'التفاصيل / الفترة',
      width: '20%',
      valueGetter: (row) => {
        if (row.durationType === PermissionDurationType.HalfDay) {
          return row.halfDayPeriod === HalfDayPeriod.Afternoon ? 'فترة بعد الظهر' : 'فترة صباحية';
        }
        return `من ${row.fromTime || '--'} إلى ${row.toTime || '--'}`;
      },
    },
    {
      id: 'status',
      header: 'الحالة',
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
        this.openActionDialog('approve', row.id);
      },
    },
    {
      id: 'reject',
      icon: 'pi pi-times',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-danger',
      visible: (row) => row.status === PermissionRequestStatus.Pending,
      onClick: (row) => {
        this.openActionDialog('reject', row.id);
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
        this.openActionDialog('cancel', row.id);
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
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في تحميل طلبات الأذونات من الخادم',
        });
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

  openActionDialog(action: PermissionActionType, requestId: string): void {
    this.currentAction.set(action);
    this.currentRequestId.set(requestId);
    this.actionDialogOpen.set(true);
  }

  handleActionConfirm(event: PermissionActionEvent): void {
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
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail:
            event.action === 'approve'
              ? 'تمت الموافقة على طلب الإذن بنجاح'
              : event.action === 'reject'
              ? 'تم رفض طلب الإذن بنجاح'
              : 'تم إلغاء طلب الإذن بنجاح',
        });
        this.loadRequests();
      },
      error: () => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء معالجة طلب الإذن',
        });
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
