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
import { TimeAttendanceSettingsDto } from '../../../core/api/generated/model/models';
import { TimeAttendanceSettingsService } from '../../../core/api/generated/api/api';

@Component({
  selector: 'app-time-attendance-settings',
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
  templateUrl: './time-attendance-settings.component.html',
  styleUrl: './time-attendance-settings.component.scss',
})
export class TimeAttendanceSettingsComponent implements OnInit {
  private readonly settingsApi = inject(TimeAttendanceSettingsService);

  readonly loading = signal(false);
  readonly settings = signal<TimeAttendanceSettingsDto[]>([]);
  readonly searchText = signal('');

  readonly filteredSettings = computed(() => {
    const list = this.settings();
    const q = this.searchText().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.key?.toLowerCase().includes(q)) ||
        (s.value?.toLowerCase().includes(q)) ||
        (s.description?.toLowerCase().includes(q))
    );
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.settingsApi.timeAttendanceSettingsGetAll().pipe(map((res) => res.data ?? [])).subscribe({
      next: (list) => {
        this.settings.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
