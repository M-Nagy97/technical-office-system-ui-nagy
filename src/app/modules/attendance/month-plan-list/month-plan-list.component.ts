import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';

import { map } from 'rxjs/operators';
import { PlansService, PlanListItemDto } from '../../../core/api/generated';

@Component({
  selector: 'app-month-plan-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    RippleModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  templateUrl: './month-plan-list.component.html',
  styleUrl: './month-plan-list.component.scss',
})
export class MonthPlanListComponent implements OnInit {
  private readonly plansApi = inject(PlansService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly plans = signal<PlanListItemDto[]>([]);
  readonly searchText = signal('');

  readonly filteredPlans = computed(() => {
    const list = this.plans();
    const q = this.searchText().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        (p.name?.toLowerCase().includes(q)) ||
        (p.description?.toLowerCase().includes(q))
    );
  });

  readonly columns: SharedTableColumn<PlanListItemDto>[] = [
    { id: 'name', header: 'الاسم', field: 'name', sortableField: 'name' },
    { id: 'description', header: 'الوصف', valueGetter: (p) => p.description ?? '—' },
    { id: 'isActive', header: 'حالة النشاط', valueGetter: (p) => p.isActive },
  ];

  readonly actions: SharedTableAction<PlanListItemDto>[] = [
    {
      id: 'view',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => {
        if (!row.id) return;
        this.router.navigate(['/attendance/plans', row.id]);
      },
    },
    {
      id: 'employees',
      icon: 'pi pi-users',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => {
        if (!row.id) return;
        this.router.navigate(['/attendance/plans', row.id, 'employees']);
      },
    },
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => {
        if (!row.id) return;
        this.router.navigate(['/attendance/plans', row.id, 'edit']);
      },
    },
  ];

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading.set(true);
    this.plansApi.plansGetAll().pipe(map((res) => res.data ?? [])).subscribe({
      next: (list) => {
        this.plans.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
