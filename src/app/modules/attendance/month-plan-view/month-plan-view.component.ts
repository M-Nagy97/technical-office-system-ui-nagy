import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { map } from 'rxjs/operators';
import { PlansService, PlanDto, FactorType, FactorMode } from '../../../core/api/generated';

@Component({
  selector: 'app-month-plan-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    SkeletonModule,
  ],
  templateUrl: './month-plan-view.component.html',
  styleUrl: './month-plan-view.component.scss',
})
export class MonthPlanViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly plansApi = inject(PlansService);

  readonly loading = signal(true);
  readonly plan = signal<PlanDto | null>(null);

  getFactorTypeName(type: FactorType | undefined): string {
    switch (type) {
      case 1: return 'تأخير';
      case 2: return 'خروج مبكر';
      case 3: return 'إضافي قبل';
      case 4: return 'إضافي بعد';
      default: return '—';
    }
  }

  getFactorModeName(mode: FactorMode | undefined): string {
    switch (mode) {
      case 1: return 'ثابت';
      case 2: return 'شرائح';
      default: return '—';
    }
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.plansApi.plansGetById(id).pipe(map((r: any) => r.data ?? null)).subscribe({
      next: (data: PlanDto) => {
        this.plan.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
