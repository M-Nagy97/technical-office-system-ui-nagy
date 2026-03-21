import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';

import { map } from 'rxjs/operators';
import { PlanSchedulesService, PlanScheduleDto } from '../../../core/api/generated';

@Component({
  selector: 'app-schedule-list',
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
  templateUrl: './schedule-list.component.html',
  styleUrl: './schedule-list.component.scss',
})
export class ScheduleListComponent implements OnInit {
  private readonly schedulesApi = inject(PlanSchedulesService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly schedules = signal<PlanScheduleDto[]>([]);
  readonly searchText = signal('');
  readonly planId = signal<string | null>(null);

  readonly filteredSchedules = computed(() => {
    const list = this.schedules();
    const q = this.searchText().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.scheduleDate?.toLowerCase().includes(q)) ||
        (s.notes?.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    const pId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.queryParamMap.get('planId');
    if (pId) {
      this.planId.set(pId);
      this.loadSchedules(pId);
    }
  }

  loadSchedules(planId: string): void {
    this.loading.set(true);
    this.schedulesApi.planSchedulesGet(planId).pipe(map((res) => res.data ?? [])).subscribe({
      next: (list) => {
        this.schedules.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatDate(value: string | undefined): string {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString('ar-EG');
    } catch {
      return value;
    }
  }
}
