import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import {
  FilterBarComponent,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
  tableEditAction,
  formatAppTime,
} from '../../../shared';
import { LanguageService } from '../../../core/services/language.service';

import { PermissionService } from '../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { map } from 'rxjs/operators';
import { ShiftsService, ShiftDto } from '../../../core/api/generated';

@Component({
  selector: 'app-shift-list',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    TagModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    HasPermissionDirective,
    FilterBarComponent,
  ],
  templateUrl: './shift-list.component.html',
  styleUrl: './shift-list.component.scss',
})
export class ShiftListComponent implements OnInit {
  private readonly shiftsApi = inject(ShiftsService);
  private readonly router = inject(Router);
  private readonly permission = inject(PermissionService);
  private readonly language = inject(LanguageService);

  readonly loading = signal(false);
  readonly shifts = signal<ShiftDto[]>([]);
  readonly searchText = signal('');

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts(): void {
    this.loading.set(true);
    this.shiftsApi.shiftsGetAll().pipe(
      map((res: any) => res.data ?? [])
    ).subscribe({
      next: (list: ShiftDto[]) => {
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
        (s.shiftCode?.toLowerCase().includes(q)) ||
        (s.shiftName?.toLowerCase().includes(q))
    );
  });

  readonly columns: SharedTableColumn<ShiftDto>[] = [
    { id: 'shiftCode', header: 'common.code', field: 'shiftCode' },
    { id: 'shiftName', header: 'common.name', field: 'shiftName' },
    { id: 'shiftStart', header: 'shifts.start', valueGetter: (row) => this.formatTime(row.shiftStart) },
    { id: 'shiftEnd', header: 'shifts.end', valueGetter: (row) => this.formatTime(row.shiftEnd) },
    {
      id: 'fingerIn',
      header: 'shifts.finger_in',
      valueGetter: (row) => `${this.formatTime(row.fingerInFrom)} - ${this.formatTime(row.fingerInTo)}`,
    },
    {
      id: 'fingerOut',
      header: 'shifts.finger_out',
      valueGetter: (row) => `${this.formatTime(row.fingerOutFrom)} - ${this.formatTime(row.fingerOutTo)}`,
    },
    {
      id: 'crossesMidnight',
      header: 'shifts.crosses_midnight',
      valueGetter: (row) => row.crossesMidnight,
      cellClass: (row) => (row.crossesMidnight ? 'text-blue-500' : 'text-500'),
    },
    { id: 'isActive', header: 'common.status', valueGetter: (row) => row.isActive },
  ];

  readonly actions: SharedTableAction<ShiftDto>[] = [
    tableEditAction((row) => {
      if (!row.id) return;
      this.router.navigate(['/attendance/shifts', row.id, 'edit']);
    }, { visible: this.permission.writeVisible('attendance') }),
  ];

  formatTime(value: string | undefined): string {
    return formatAppTime(value, this.language.currentLang());
  }
}
