import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { SidebarModule } from 'primeng/sidebar';
import { TagModule } from 'primeng/tag';
import { PenaltyFormComponent } from '../penalty-form/penalty-form.component';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { PenaltyService } from '../../../core';
import { Penalty, PenaltyType, PenaltyStatus } from '../../../core';
import { LanguageService } from '../../../core/services/language.service';
import {
  AppDatePipe,
  FilterBarComponent,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
  StatCardComponent,
} from '../../../shared';

const TYPE_OPTIONS: { labelKey: string; value: PenaltyType | null }[] = [
  { labelKey: 'common.all', value: null },
  { labelKey: 'penalties.types.warning', value: 'warning' },
  { labelKey: 'penalties.types.written_warning', value: 'written_warning' },
  { labelKey: 'penalties.types.deduction', value: 'deduction' },
  { labelKey: 'penalties.types.suspension', value: 'suspension' },
  { labelKey: 'penalties.types.dismissal', value: 'dismissal' },
];
const STATUS_OPTIONS: { labelKey: string; value: PenaltyStatus | null }[] = [
  { labelKey: 'common.all', value: null },
  { labelKey: 'penalties.statuses.pending', value: 'pending' },
  { labelKey: 'penalties.statuses.approved', value: 'approved' },
  { labelKey: 'penalties.statuses.appealed', value: 'appealed' },
  { labelKey: 'penalties.statuses.cancelled', value: 'cancelled' },
];

@Component({
  selector: 'app-penalty-list',
  standalone: true,
  imports: [
    NgClass,
    RouterLink,
    FormsModule,
    TranslatePipe,
    CardModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    SidebarModule,
    TagModule,
    PenaltyFormComponent,
    HasPermissionDirective,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    StatCardComponent,
    FilterBarComponent,
    AppDatePipe,
  ],
  templateUrl: './penalty-list.component.html',
  styleUrl: './penalty-list.component.scss',
})
export class PenaltyListComponent implements OnInit {
  private readonly penaltyService = inject(PenaltyService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  readonly employeeFilter = signal<string | null>(null);
  readonly typeFilter = signal<PenaltyType | null>(null);
  readonly statusFilter = signal<PenaltyStatus | null>(null);
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);
  readonly searchText = signal<string>('');
  readonly sidebarVisible = signal(false);
  readonly selectedPenalty = signal<Penalty | null>(null);
  readonly addDialogVisible = signal(false);

  readonly typeOptionsWithAll = TYPE_OPTIONS;
  readonly statusOptionsWithAll = STATUS_OPTIONS;
  readonly employeeOptions = computed(() => {
    this.language.currentLang();
    return [
      { label: this.translate.instant('common.all'), value: null as string | null },
      ...this.penaltyService.getList().reduce((acc, p) => {
        if (!acc.some((x) => x.value === p.employeeId)) acc.push({ label: p.employeeName, value: p.employeeId });
        return acc;
      }, [] as { label: string; value: string }[]),
    ];
  });

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
    return this.translate.instant(`penalties.types.${type}`);
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
    return this.translate.instant(`penalties.statuses.${status}`);
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

  readonly columns: SharedTableColumn<Penalty>[] = [
    { id: 'penaltyNumber', header: 'penalties.number', field: 'penaltyNumber' },
    { id: 'employeeName', header: 'common.employee', field: 'employeeName' },
    { id: 'type', header: 'penalties.type', field: 'type' },
    { id: 'reason', header: 'penalties.reason', field: 'reason' },
    { id: 'incidentDate', header: 'penalties.incident_date' },
    { id: 'status', header: 'common.status', field: 'status' },
  ];

  readonly rowClassForPenalty = (row: Penalty): string => `clickable-row ${this.getSeverityClass(row.type)}`.trim();

  onPenaltyRowClick(row: Penalty, _event: MouseEvent): void {
    this.openRow(row);
  }
}
