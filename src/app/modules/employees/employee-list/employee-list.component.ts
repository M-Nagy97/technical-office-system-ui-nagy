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
import { EmployeeService, filterEmployees } from '../../../core/services/employee.service';
import { Employee, EmployeeStatus, EmploymentType } from '../../../core/models/employee.model';
import {
  SharedTableComponent,
  SharedTableAction,
  SharedTableColumn,
  SharedTableCellTemplateDirective,
} from '../../../shared';

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  terminated: 'منتهي',
  retired: 'متقاعد',
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  permanent: 'دائم',
  temporary: 'مؤقت',
  contract: 'عقد',
};

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
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  templateUrl: './employee-list.component.html',
  styleUrl: './employee-list.component.scss',
})
export class EmployeeListComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly router = inject(Router);

  readonly searchText = signal('');
  readonly departmentFilter = signal<string | null>(null);
  readonly statusFilter = signal<EmployeeStatus | null>(null);
  readonly employmentTypeFilter = signal<EmploymentType | null>(null);
  readonly loading = signal(false);
  readonly first = signal(0);
  readonly rows = signal(10);
  readonly totalRecords = signal(0);

  readonly departments = signal<string[]>([]);
  readonly statusOptions = [
    { label: 'نشط', value: 'active' },
    { label: 'موقوف', value: 'suspended' },
    { label: 'منتهي', value: 'terminated' },
    { label: 'متقاعد', value: 'retired' },
  ];
  readonly employmentTypeOptions = [
    { label: 'دائم', value: 'permanent' },
    { label: 'مؤقت', value: 'temporary' },
    { label: 'عقد', value: 'contract' },
  ];

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
    { id: 'photo', header: 'الصورة', valueGetter: () => null, width: '4rem' },
    { id: 'employeeNumber', header: 'رقم الموظف', field: 'employeeNumber', sortableField: 'employeeNumber' },
    { id: 'fullName', header: 'الاسم الكامل', field: 'fullName', sortableField: 'fullName' },
    { id: 'jobTitle', header: 'المسمى الوظيفي', field: 'jobTitle' },
    { id: 'department', header: 'القسم', field: 'department' },
    { id: 'status', header: 'الحالة', field: 'status', sortableField: 'status' },
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
    this.loadEmployees();
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

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
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

  getEmploymentTypeLabel(value: string): string {
    return EMPLOYMENT_TYPE_LABELS[value] ?? value;
  }
}

