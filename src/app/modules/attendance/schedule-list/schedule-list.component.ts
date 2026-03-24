import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';

import { map } from 'rxjs/operators';
import { PlanSchedulesService, PlanScheduleDto } from '../../../core/api/generated';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';

@Component({
  selector: 'app-schedule-list',
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
  templateUrl: './schedule-list.component.html',
  styleUrl: './schedule-list.component.scss',
})
export class ScheduleListComponent implements OnInit {
  private readonly schedulesApi = inject(PlanSchedulesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

  readonly columns: SharedTableColumn<PlanScheduleDto>[] = [
    {
      id: 'scheduleDate',
      header: 'التاريخ',
      valueGetter: (row) => this.formatDate(row.scheduleDate),
    },
    { id: 'shiftId', header: 'الشيفت', valueGetter: (row) => row.shiftId ?? '—' },
    { id: 'dayType', header: 'نوع اليوم', field: 'dayType' },
    { id: 'isHoliday', header: 'عطلة؟', field: 'isHoliday' },
    { id: 'notes', header: 'ملاحظات', valueGetter: (row) => row.notes ?? '—' },
  ];

  readonly actions: SharedTableAction<PlanScheduleDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => {
        if (!this.planId()) return;
        if (!row.id) return;
        this.router.navigate(['/attendance/plans', this.planId()!, 'schedules', row.id, 'edit']);
      },
    },
  ];
}
