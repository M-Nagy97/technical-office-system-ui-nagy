import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';

import { map } from 'rxjs/operators';
import { ShiftsService, ShiftDto } from '../../../core/api/generated';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    RippleModule,
  ],
  templateUrl: './shift-list.component.html',
  styleUrl: './shift-list.component.scss',
})
export class ShiftListComponent implements OnInit {
  private readonly shiftsApi = inject(ShiftsService);

  readonly loading = signal(false);
  readonly shifts = signal<ShiftDto[]>([]);
  readonly searchText = signal('');

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts(): void {
    this.loading.set(true);
    this.shiftsApi.shiftsGetAll().pipe(
      map((res) => res.data ?? [])
    ).subscribe({
      next: (list) => {
        this.shifts.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  readonly filteredShifts = computed(() => {
    const list = this.shifts();
    const q = this.searchText().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.code?.toLowerCase().includes(q)) ||
        (s.name?.toLowerCase().includes(q))
    );
  });

  getShiftTypeLabel(type: number | undefined): string {
    if (type == null) return '—';
    const labels: Record<number, string> = {
      0: 'عادي',
      1: 'صباحي',
      2: 'مسائي',
      3: 'ليلي',
      4: 'مرن',
    };
    return labels[type] ?? String(type);
  }

  formatTime(value: string | undefined): string {
    if (!value) return '—';
    return value;
  }
}
