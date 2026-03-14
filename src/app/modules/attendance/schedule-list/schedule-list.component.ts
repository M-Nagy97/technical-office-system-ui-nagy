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
import { SchedulesService, ScheduleDto } from '../../../core/api/generated';

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
  private readonly schedulesApi = inject(SchedulesService);

  readonly loading = signal(false);
  readonly schedules = signal<ScheduleDto[]>([]);
  readonly searchText = signal('');

  readonly filteredSchedules = computed(() => {
    const list = this.schedules();
    const q = this.searchText().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.employeeId?.toLowerCase().includes(q)) ||
        (s.shiftId?.toLowerCase().includes(q)) ||
        (s.notes?.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadSchedules();
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.schedulesApi.schedulesGetAll().pipe(map((res) => res.data ?? [])).subscribe({
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
