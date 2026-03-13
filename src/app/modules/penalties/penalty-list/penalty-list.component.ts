import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { SidebarModule } from 'primeng/sidebar';
import { TagModule } from 'primeng/tag';
import { PenaltyFormComponent } from '../penalty-form/penalty-form.component';
import { PenaltyService } from '../../../core/services/penalty.service';
import { Penalty, PenaltyType, PenaltyStatus, PENALTY_TYPE_LABELS, PENALTY_STATUS_LABELS } from '../../../core/models/penalty.model';

const TYPE_OPTIONS = (Object.entries(PENALTY_TYPE_LABELS) as [PenaltyType, string][]).map(([value, label]) => ({ label, value }));
const STATUS_OPTIONS = (Object.entries(PENALTY_STATUS_LABELS) as [PenaltyStatus, string][]).map(([value, label]) => ({ label, value }));
const TYPE_OPTIONS_WITH_ALL = [{ label: 'الكل', value: null as PenaltyType | null }, ...TYPE_OPTIONS];
const STATUS_OPTIONS_WITH_ALL = [{ label: 'الكل', value: null as PenaltyStatus | null }, ...STATUS_OPTIONS];

@Component({
  selector: 'app-penalty-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    InputTextModule,
    TableModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    SidebarModule,
    TagModule,
    PenaltyFormComponent,
  ],
  templateUrl: './penalty-list.component.html',
  styleUrl: './penalty-list.component.scss',
})
export class PenaltyListComponent implements OnInit {
  private readonly penaltyService = inject(PenaltyService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly employeeFilter = signal<string | null>(null);
  readonly typeFilter = signal<PenaltyType | null>(null);
  readonly statusFilter = signal<PenaltyStatus | null>(null);
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);
  readonly searchText = signal<string>('');
  readonly sidebarVisible = signal(false);
  readonly selectedPenalty = signal<Penalty | null>(null);
  readonly addDialogVisible = signal(false);

  readonly typeOptions = TYPE_OPTIONS;
  readonly typeOptionsWithAll = TYPE_OPTIONS_WITH_ALL;
  readonly statusOptions = STATUS_OPTIONS;
  readonly statusOptionsWithAll = STATUS_OPTIONS_WITH_ALL;
  readonly employeeOptions = computed(() => [
    { label: 'الكل', value: null as string | null },
    ...this.penaltyService.getList().reduce((acc, p) => {
      if (!acc.some((x) => x.value === p.employeeId)) acc.push({ label: p.employeeName, value: p.employeeId });
      return acc;
    }, [] as { label: string; value: string }[]),
  ]);

  readonly filteredPenalties = computed(() =>
    this.penaltyService.search({
      employeeId: this.employeeFilter(),
      type: this.typeFilter(),
      status: this.statusFilter(),
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      searchText: this.searchText() || null,
    })
  );

  readonly stats = computed(() => {
    const list = this.penaltyService.getList();
    const byType: Record<PenaltyType, number> = {
      warning: 0,
      written_warning: 0,
      deduction: 0,
      suspension: 0,
      dismissal: 0,
    };
    list.forEach((p) => byType[p.type]++);
    return {
      total: list.length,
      ...byType,
    };
  });

  ngOnInit(): void {
    const empId = this.route.snapshot.queryParamMap.get('employeeId');
    if (empId) this.employeeFilter.set(empId);
  }

  openRow(penalty: Penalty): void {
    this.selectedPenalty.set(penalty);
    this.sidebarVisible.set(true);
  }

  closeSidebar(): void {
    this.sidebarVisible.set(false);
    this.selectedPenalty.set(null);
  }

  openAdd(): void {
    this.addDialogVisible.set(true);
  }

  onFormSaved(): void {
    this.addDialogVisible.set(false);
  }

  onFormCancelled(): void {
    this.addDialogVisible.set(false);
  }

  getTypeLabel(type: PenaltyType): string {
    return PenaltyService.getTypeLabel(type);
  }

  getSeverityClass(type: PenaltyType): string {
    switch (type) {
      case 'warning':
        return 'severity-warning';
      case 'written_warning':
        return 'severity-written';
      case 'deduction':
        return 'severity-deduction';
      case 'suspension':
        return 'severity-suspension';
      case 'dismissal':
        return 'severity-dismissal';
      default:
        return '';
    }
  }

  getStatusLabel(status: PenaltyStatus): string {
    return PenaltyService.getStatusLabel(status);
  }

  getStatusSeverity(status: PenaltyStatus): 'success' | 'warning' | 'danger' | 'secondary' {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'appealed':
        return 'secondary';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('ar-EG');
  }
}
