import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';

import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
// import { TimeAttendanceSettingsDto } from '../../../core/api/generated/model/models';
// import { TimeAttendanceSettingsService } from '../../../core/api/generated/api/api';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';

export interface TimeAttendanceSettingsDto {
  key?: string;
  value?: string;
  valueType?: string;
  description?: string;
}

@Component({
  selector: 'app-time-attendance-settings',
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
  ],
  templateUrl: './time-attendance-settings.component.html',
  styleUrl: './time-attendance-settings.component.scss',
})
export class TimeAttendanceSettingsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly settingsApi: any = null; // To be replaced
  private readonly router = inject(Router);

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
    // Placeholder until service is found/created
    this.loading.set(false);
    /*
    this.settingsApi.timeAttendanceSettingsGetAll().pipe(map((res: any) => res.data ?? [])).subscribe({
      next: (list: TimeAttendanceSettingsDto[]) => {
        this.settings.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    */
  }

  readonly columns: SharedTableColumn<TimeAttendanceSettingsDto>[] = [
    { id: 'key', header: 'المفتاح', valueGetter: (row) => row.key ?? '—' },
    { id: 'value', header: 'القيمة', valueGetter: (row) => row.value ?? '—' },
    { id: 'valueType', header: 'نوع القيمة', valueGetter: (row) => row.valueType ?? '—' },
    { id: 'description', header: 'الوصف', valueGetter: (row) => row.description ?? '—' },
  ];

  readonly actions: SharedTableAction<TimeAttendanceSettingsDto>[] = [
    {
      id: 'edit',
      icon: 'pi pi-pencil',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => {
        if (!row.key) return;
        this.router.navigate(['/attendance/settings', row.key, 'edit']);
      },
    },
  ];
}
