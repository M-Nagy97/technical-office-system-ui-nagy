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
import { MonthPlansService, MonthPlanDto } from '../../../core/api/generated';

const MONTH_NAMES: Record<number, string> = {
  1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل', 5: 'مايو', 6: 'يونيو',
  7: 'يوليو', 8: 'أغسطس', 9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر',
};

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
  private readonly monthPlansApi = inject(MonthPlansService);

  readonly loading = signal(false);
  readonly plans = signal<MonthPlanDto[]>([]);
  readonly searchText = signal('');

  readonly filteredPlans = computed(() => {
    const list = this.plans();
    const q = this.searchText().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        String(p.year).includes(q) ||
        String(p.month).includes(q) ||
        (p.status?.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading.set(true);
    this.monthPlansApi.monthPlansGetAll().pipe(map((res) => res.data ?? [])).subscribe({
      next: (list) => {
        this.plans.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getMonthYearLabel(plan: MonthPlanDto): string {
    const m = plan.month != null ? MONTH_NAMES[plan.month] ?? plan.month : '—';
    const y = plan.year ?? '—';
    return `${m} ${y}`;
  }

  detailCount(plan: MonthPlanDto): number {
    return plan.details?.length ?? 0;
  }
}
