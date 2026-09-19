import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EmployeeService, filterEmployees } from '../../../core/services/employee.service';
import { Employee, EmployeeStatus, EmploymentType } from '../../../core/models/employee.model';
import {
  SharedTableComponent,
  SharedTableAction,
  SharedTableColumn,
  SharedTableCellTemplateDirective,
} from '../../../shared';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    AvatarModule,
    TooltipModule,
    RippleModule,
    TranslateModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss',
})
export class EmployeeListComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly searchText = signal('');
  readonly departmentFilter = signal<string | null>(null);
  readonly statusFilter = signal<EmployeeStatus | null>(null);
  readonly employmentTypeFilter = signal<EmploymentType | null>(null);
  readonly loading = signal(false);
  readonly first = signal(0);
  readonly rows = signal(10);
  readonly totalRecords = signal(0);

  readonly departments = signal<string[]>([]);
  statusOptions: { label: string; value: string }[] = [];
  employmentTypeOptions: { label: string; value: string }[] = [];
  pageReportTemplate = '';

  readonly employees = this.employeeService.employees;

  readonly filteredEmployees = computed(() =>
    filterEmployees(this.employees(), {
      query: this.searchText(),
      department: this.departmentFilter(),
      status: this.statusFilter(),
      employmentType: this.employmentTypeFilter(),
    })
  );

  readonly stats = computed(() => {
    const list = this.employees();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const newThisMonth = list.filter((e) => {
      const d = e.appointmentDate;
      return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    return {
      total: list.length,
      active: list.filter((e) => e.status === 'active').length,
      suspended: list.filter((e) => e.status === 'suspended').length,
      newThisMonth,
    };
  });

  readonly columns: SharedTableColumn<Employee>[] = [
    { id: 'photo', header: 'employees.list.col_photo', valueGetter: () => null, width: '4rem' },
    {
      id: 'employeeNumber',
      header: 'employees.list.col_employee_number',
      field: 'employeeNumber',
      sortableField: 'employeeNumber',
    },
    {
      id: 'fullName',
      header: 'employees.list.col_full_name',
      field: 'fullName',
      sortableField: 'fullName',
    },
    { id: 'jobTitle', header: 'employees.list.col_job_title', field: 'jobTitle' },
    { id: 'department', header: 'employees.list.col_department', field: 'department' },
    { id: 'status', header: 'employees.list.col_status', field: 'status', sortableField: 'status' },
  ];

  readonly actions: SharedTableAction<Employee>[] = [
    {
      id: 'view',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded',
      onClick: (row) => {
        if (!row.id) return;
        this.router.navigate(['/employees', row.id]);
      },
    },
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded',
      onClick: (row) => {
        if (!row.id) return;
        this.router.navigate(['/employees', row.id, 'edit']);
      },
    },
  ];

  ngOnInit(): void {
    this.rebuildLabels();
    this.translate.onLangChange.subscribe(() => this.rebuildLabels());
    this.loadEmployees();
  }

  private rebuildLabels(): void {
    this.statusOptions = [
      { label: this.translate.instant('employees.status.active'), value: 'active' },
      { label: this.translate.instant('employees.status.suspended'), value: 'suspended' },
      { label: this.translate.instant('employees.status.terminated'), value: 'terminated' },
      { label: this.translate.instant('employees.status.retired'), value: 'retired' },
    ];
    this.employmentTypeOptions = [
      { label: this.translate.instant('employees.employment_type.permanent'), value: 'permanent' },
      { label: this.translate.instant('employees.employment_type.temporary'), value: 'temporary' },
      { label: this.translate.instant('employees.employment_type.contract'), value: 'contract' },
    ];
    this.pageReportTemplate = this.translate.instant('employees.list.page_report');
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.employeeService.fetchAll().subscribe({
      next: (list) => {
        const depts = [...new Set(list.map((e) => e.department))].sort().filter(Boolean) as string[];
        this.departments.set(depts);
        this.totalRecords.set(list.length);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onPage(event: { first: number; rows: number }): void {
    this.first.set(event.first);
    this.rows.set(event.rows ?? 10);
  }

  statusLabelKey(status: string): string {
    return `employees.status.${status}`;
  }

  getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'secondary' {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'terminated':
      case 'retired':
        return 'secondary';
      default:
        return 'secondary';
    }
  }
}
