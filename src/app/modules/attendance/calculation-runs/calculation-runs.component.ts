import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { SharedTableCellTemplateDirective } from '../../../shared/components/shared-table/shared-table-cell-template.directive';
import {
  AttendanceCalcService,
  AttendanceCalculationRunDetailDto,
  AttendanceCalculationRunDto,
  PunchPairingMethod,
} from '../../../core/api/generated';

@Component({
  selector: 'app-calculation-runs',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    TranslatePipe,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
  ],
  providers: [MessageService],
  templateUrl: './calculation-runs.component.html',
  styleUrl: './calculation-runs.component.scss',
})
export class CalculationRunsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly calcApi = inject(AttendanceCalcService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  readonly PunchPairingMethod = PunchPairingMethod;

  readonly rows = signal<AttendanceCalculationRunDto[]>([]);
  readonly loading = signal(false);

  detailVisible = false;
  detailLoading = false;
  readonly detail = signal<AttendanceCalculationRunDetailDto | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.loading.set(true);
    this.calcApi
      .attendanceCalcRuns(200)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          if (res.success === false) {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: res.message || 'Failed to load runs.',
            });
            return;
          }
          this.rows.set(res.data ?? []);
        },
        error: () =>
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load runs.',
          }),
      });
  }

  openDetail(id: string | undefined): void {
    if (!id) return;
    this.detailVisible = true;
    this.detail.set(null);
    this.detailLoading = true;
    this.calcApi
      .attendanceCalcRunDetail(id)
      .pipe(
        finalize(() => (this.detailLoading = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          if (res.success === false) {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: res.message || 'Failed to load detail.',
            });
            this.detailVisible = false;
            return;
          }
          this.detail.set(res.data ?? null);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load detail.',
          });
          this.detailVisible = false;
        },
      });
  }

  pairingLabel(m?: PunchPairingMethod): string {
    switch (m) {
      case PunchPairingMethod.NUMBER_1:
        return this.translate.instant('calculation_workbench.pairing_filo');
      case PunchPairingMethod.NUMBER_2:
        return this.translate.instant('calculation_workbench.pairing_fifo');
      case PunchPairingMethod.NUMBER_3:
        return this.translate.instant('calculation_workbench.pairing_lilo');
      default:
        return '—';
    }
  }

  formatJsonBlock(json: string | null | undefined): string {
    if (!json) return '—';
    try {
      const o = JSON.parse(json) as Record<string, unknown>;
      return JSON.stringify(o, null, 2);
    } catch {
      return json;
    }
  }

  readonly columns: SharedTableColumn<AttendanceCalculationRunDto>[] = [
    { id: 'createdAtUtc', header: 'calculation_runs.col_created', valueGetter: (r) => r.createdAtUtc },
    { id: 'range', header: 'calculation_runs.col_range', valueGetter: (r) => `${r.fromDate} — ${r.toDate}` },
    { id: 'pairingMethod', header: 'calculation_runs.col_pairing', valueGetter: (r) => this.pairingLabel(r.pairingMethod) },
    { id: 'employeeCount', header: 'calculation_runs.col_employees', field: 'employeeCount', align: 'end' },
    { id: 'daySpan', header: 'calculation_runs.col_days', field: 'daySpan', align: 'end' },
    { id: 'note', header: 'calculation_runs.col_note', valueGetter: (r) => r.note ?? '—' },
  ];

  readonly actions: SharedTableAction<AttendanceCalculationRunDto>[] = [
    {
      id: 'view',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      onClick: (row) => this.openDetail(row.id),
    },
  ];
}
