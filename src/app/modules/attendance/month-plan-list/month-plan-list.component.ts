import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import {
  FilterBarComponent,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
  tableCustomAction,
  tableEditAction,
  tableViewAction,
} from '../../../shared';

import { PermissionService } from '../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { map } from 'rxjs/operators';
import { PlansService, PlanListItemDto } from '../../../core/api/generated';

@Component({
  selector: 'app-month-plan-list',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    HasPermissionDirective,
    FilterBarComponent,
  ],
  templateUrl: './month-plan-list.component.html',
  styleUrl: './month-plan-list.component.scss',
})
export class MonthPlanListComponent implements OnInit {
  private readonly plansApi = inject(PlansService);
  private readonly router = inject(Router);
  private readonly permission = inject(PermissionService);

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
    { id: 'name', header: 'common.name', field: 'name', sortableField: 'name' },
    { id: 'description', header: 'common.description', valueGetter: (p) => p.description ?? '—' },
    { id: 'isActive', header: 'common.status', valueGetter: (p) => p.isActive },
  ];

  readonly actions: SharedTableAction<PlanListItemDto>[] = [
    tableViewAction((row) => {
      if (!row.id) return;
      this.router.navigate(['/attendance/plans', row.id]);
    }),
    tableCustomAction({
      id: 'employees',
      icon: 'pi pi-users',
      tooltip: 'common.open',
      onClick: (row) => {
        if (!row.id) return;
        this.router.navigate(['/attendance/plans', row.id, 'employees']);
      },
    }),
    tableEditAction((row) => {
      if (!row.id) return;
      this.router.navigate(['/attendance/plans', row.id, 'edit']);
    }, { visible: this.permission.writeVisible('attendance') }),
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
