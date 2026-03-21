import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';

import { map } from 'rxjs/operators';
import { PlansService, PlanListItemDto } from '../../../core/api/generated';

@Component({
  selector: 'app-month-plan-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    RippleModule,
  ],
  templateUrl: './month-plan-list.component.html',
  styleUrl: './month-plan-list.component.scss',
})
export class MonthPlanListComponent implements OnInit {
  private readonly plansApi = inject(PlansService);

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
