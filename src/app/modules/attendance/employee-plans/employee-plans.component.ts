import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import {
  PlansService,
  EmployeesService,
  EmployeePlansService,
  EmployeeDto,
  PlanListItemDto,
  PlanDto,
} from '../../../core/api/generated';
import { EmployeePlanListItemDto } from '../../../core/api/manual/employee-plans.models';

type EmployeeAssignmentView = EmployeePlanListItemDto & {
  planId: string;
  planName: string;
};

@Component({
  selector: 'app-employee-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardModule, ButtonModule, MultiSelectModule, DropdownModule, TooltipModule, TableModule],
  templateUrl: './employee-plans.component.html',
  styleUrl: './employee-plans.component.scss',
})
export class EmployeePlansComponent implements OnInit {
  private readonly plansApi = inject(PlansService);
  private readonly employeePlansApi = inject(EmployeePlansService);
  private readonly messageService = inject(MessageService);
  private readonly http = inject(HttpClient);

  readonly plans = signal<PlanListItemDto[]>([]);
  readonly selectedPlanId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  /** All employees from TimeAttendance integrated endpoint */
  readonly allAttendanceEmployees = signal<any[]>([]);

  /** Employees currently assigned to the selected plan */
  readonly assignedToSelected = computed(() => {
    const planId = this.selectedPlanId();
    if (!planId) return [];
    return this.allAttendanceEmployees().filter(e => e.planId === planId);
  });

  /** Employees not assigned to any plan */
  readonly unassignedEmployees = computed(() => {
    return this.allAttendanceEmployees().filter(e => !e.planId);
  });

  /** IDs to add (selected from unassigned) */
  readonly selectedToAdd = signal<string[]>([]);

  ngOnInit(): void {
    this.loadPlans();
    this.refreshAllEmployees();
  }

  loadPlans(): void {
    this.plansApi.plansGetAll().pipe(map((r: any) => r.data ?? [])).subscribe((list: any) => {
      this.plans.set(list);
    });
  }

  refreshAllEmployees(): void {
    this.loading.set(true);

    // Direct call to bypass outdated generated service (client sync issue)
    this.employeePlansApi.employeePlansGetAllEmployees().pipe(
      map((r: any) => r.data ?? [])
    ).subscribe({
      next: (list: any[]) => {
        this.allAttendanceEmployees.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  assignEmployees(): void {
    const planId = this.selectedPlanId();
    const employeeIds = this.selectedToAdd();
    if (!planId || employeeIds.length === 0) return;

    this.saving.set(true);
    const requests = employeeIds.map(empId =>
      this.employeePlansApi.employeePlansAssign({ planId, employeeId: empId })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.saving.set(false);
        this.selectedToAdd.set([]);
        this.messageService.add({ severity: 'success', summary: 'تم', detail: 'تم التعيين بنجاح' });
        this.refreshAllEmployees();
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل التعيين' });
      }
    });
  }

  unassignEmployee(employeeId: string): void {
    this.saving.set(true);
    this.employeePlansApi.employeePlansUnassign({ employeeId }).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'تم', detail: 'تم إلغاء التعيين' });
        this.refreshAllEmployees();
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'خطأ', detail: 'فشل إلغاء التعيين' });
      }
    });
  }
}
