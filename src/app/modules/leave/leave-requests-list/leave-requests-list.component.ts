import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
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
import {
  LeaveRequestService,
  LeaveTypeService,
  EmployeeService,
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
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    StatusBadgeComponent,
    LeaveActionDialogComponent,
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
  readonly actionLoading = signal(false);

  readonly statusOptions = [
    { label: 'الكل', value: null },
    { label: 'مسودة', value: LeaveRequestStatus.Draft },
    { label: 'قيد الانتظار', value: LeaveRequestStatus.Pending },
    { label: 'موافق عليه', value: LeaveRequestStatus.Approved },
    { label: 'مرفوض', value: LeaveRequestStatus.Rejected },
    { label: 'ملغي', value: LeaveRequestStatus.Cancelled },
  ];

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
      header: 'الموظف',
      width: '20%',
      valueGetter: (row) => row.employeeName || this.employeeMap().get(row.employeeId) || row.employeeId,
    },
    {
      id: 'leaveType',
      header: 'نوع الإجازة',
      width: '18%',
      valueGetter: (row) => row.leaveTypeArabicName || row.leaveTypeName || '-',
    },
    {
      id: 'startDate',
      header: 'من تاريخ',
      field: 'startDate',
      sortableField: 'startDate',
      width: '13%',
      valueGetter: (row) => row.startDate,
    },
    {
      id: 'endDate',
      header: 'إلى تاريخ',
      field: 'endDate',
      sortableField: 'endDate',
      width: '13%',
      valueGetter: (row) => row.endDate,
    },
    {
      id: 'totalDays',
      header: 'الأيام',
      field: 'totalDays',
      sortableField: 'totalDays',
      width: '10%',
      valueGetter: (row) => `${row.totalDays} يوم`,
    },
    {
      id: 'status',
      header: 'الحالة',
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
        this.openActionDialog('approve', row.id);
      },
    },
    {
      id: 'reject',
      icon: 'pi pi-times',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-danger',
      visible: (row) => row.status === LeaveRequestStatus.Pending,
      onClick: (row) => {
        this.openActionDialog('reject', row.id);
      },
    },
    {
      id: 'cancel',
      icon: 'pi pi-ban',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-secondary',
      visible: (row) =>
        row.status === LeaveRequestStatus.Pending || row.status === LeaveRequestStatus.Approved,
      onClick: (row) => {
        this.openActionDialog('cancel', row.id);
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
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'فشل في تحميل طلبات الإجازات من الخادم',
        });
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

  openActionDialog(action: LeaveActionType, requestId: string): void {
    this.currentAction.set(action);
    this.currentRequestId.set(requestId);
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
        this.messageService.add({
          severity: 'success',
          summary: 'نجاح',
          detail:
            event.action === 'approve'
              ? 'تمت الموافقة على الطلب بنجاح'
              : event.action === 'reject'
              ? 'تم رفض الطلب بنجاح'
              : 'تم إلغاء الطلب بنجاح',
        });
        this.loadRequests();
      },
      error: () => {
        this.actionLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'حدث خطأ أثناء معالجة الطلب',
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
