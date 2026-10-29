import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import * as XLSX from 'xlsx';
import {
  ConfirmService,
  FilterBarComponent,
  NotifyService,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
  tableCustomAction,
  tableDeleteAction,
  tableEditAction,
} from '../../../shared';
import { PermissionService } from '../../../core/auth/permission.service';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import {
  AttendanceApiService,
  PublicHolidayDto,
  PublicHolidayImportCommitRow,
  PublicHolidayImportPreviewDto,
  PublicHolidayImportPreviewRow,
  PublicHolidayImportRowStatus,
  PublicHolidayStatus,
} from '../../../core/services/attendance-api.service';
import {
  buildHolidayExportRows,
  buildHolidayTemplateSheet,
  parseHolidayImportCsv,
  parseHolidayImportXlsx,
  parseIsoDate,
  toImportInputs,
  toYmd,
} from './public-holiday-import.helpers';

type ImportResolution = 'skip' | 'replace';
type ConfirmTarget = { kind: 'one'; row: PublicHolidayDto } | { kind: 'fixed-all' };

@Component({
  selector: 'app-public-holidays',
  standalone: true,
  imports: [
    FormsModule,
    CardModule,
    ButtonModule,
    DialogModule,
    CalendarModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    TagModule,
    CheckboxModule,
    TableModule,
    TranslateModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    HasPermissionDirective,
    FilterBarComponent,
  ],
  templateUrl: './public-holidays.component.html',
  styleUrl: './public-holidays.component.scss',
})
export class PublicHolidaysComponent implements OnInit {
  private readonly api = inject(AttendanceApiService);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmService);
  private readonly permission = inject(PermissionService);
  private readonly translate = inject(TranslateService);

  readonly PublicHolidayStatus = PublicHolidayStatus;
  readonly ImportRowStatus = PublicHolidayImportRowStatus;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly importing = signal(false);
  readonly committing = signal(false);
  readonly copying = signal(false);
  readonly confirming = signal(false);
  readonly searchText = signal('');
  readonly year = signal(new Date().getFullYear());
  readonly holidays = signal<PublicHolidayDto[]>([]);
  readonly dialogVisible = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly formName = signal('');
  readonly formFrom = signal<Date | null>(null);
  readonly formTo = signal<Date | null>(null);
  readonly formNotes = signal('');
  readonly formOccasion = signal<Date | null>(null);

  readonly importVisible = signal(false);
  readonly importPreview = signal<PublicHolidayImportPreviewDto | null>(null);
  readonly importResolutions = signal<Record<number, ImportResolution>>({});
  readonly importRecalc = signal(false);

  readonly confirmVisible = signal(false);
  readonly confirmTarget = signal<ConfirmTarget | null>(null);
  readonly confirmRecalc = signal(false);

  readonly years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 2 + i);
  readonly resolutionOptions = [
    { value: 'skip' as const, labelKey: 'public_holidays_page.skip' },
    { value: 'replace' as const, labelKey: 'public_holidays_page.replace' },
  ];

  readonly filtered = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const list = this.holidays();
    if (!q) return list;
    return list.filter(
      (h) => h.name.toLowerCase().includes(q) || (h.notes ?? '').toLowerCase().includes(q)
    );
  });

  readonly draftCount = computed(
    () => this.holidays().filter((h) => h.status === PublicHolidayStatus.Draft).length
  );
  readonly movableDraftCount = computed(
    () => this.holidays().filter((h) => h.status === PublicHolidayStatus.Draft && h.isMovable).length
  );
  readonly fixedDraftCount = computed(
    () => this.holidays().filter((h) => h.status === PublicHolidayStatus.Draft && !h.isMovable).length
  );

  readonly selectedImportCount = computed(() => {
    const preview = this.importPreview();
    if (!preview) return 0;
    const resolutions = this.importResolutions();
    return preview.rows.filter((row) => this.canCommitRow(row, resolutions[row.sourceRow])).length;
  });

  readonly columns: SharedTableColumn<PublicHolidayDto>[] = [
    { id: 'name', header: 'public_holidays_page.col_name', field: 'name' },
    {
      id: 'fromDate',
      header: 'public_holidays_page.col_from',
      valueGetter: (row) => row.fromDate?.slice(0, 10) ?? '',
    },
    {
      id: 'toDate',
      header: 'public_holidays_page.col_to',
      valueGetter: (row) => row.toDate?.slice(0, 10) ?? '',
    },
    { id: 'status', header: 'public_holidays_page.col_status' },
    { id: 'notes', header: 'public_holidays_page.col_notes', field: 'notes' },
  ];

  readonly actions: SharedTableAction<PublicHolidayDto>[] = [
    tableCustomAction({
      id: 'confirm',
      icon: 'pi pi-check',
      tooltip: 'public_holidays_page.confirm',
      buttonClass: 'p-button-text p-button-rounded p-button-sm p-button-success',
      visible: this.permission.writeVisible(
        'attendance',
        (row) => row.status === PublicHolidayStatus.Draft
      ),
      onClick: (row) => this.openConfirm({ kind: 'one', row }),
    }),
    tableEditAction((row) => this.openEdit(row), { visible: this.permission.writeVisible('attendance') }),
    tableDeleteAction((row) => {
      this.confirm.confirmDelete(row.name, () => this.remove(row.id));
    }, { visible: this.permission.writeVisible('attendance') }),
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getPublicHolidays({ year: this.year() }).subscribe({
      next: (rows) => {
        this.holidays.set(rows);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.notify.error(err, 'public_holidays_page.load_failed');
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formFrom.set(new Date());
    this.formTo.set(new Date());
    this.formNotes.set('');
    this.formOccasion.set(null);
    this.dialogVisible.set(true);
  }

  openEdit(row: PublicHolidayDto): void {
    this.editingId.set(row.id);
    this.formName.set(row.name);
    this.formFrom.set(parseIsoDate(row.fromDate));
    this.formTo.set(parseIsoDate(row.toDate));
    this.formNotes.set(row.notes ?? '');
    this.formOccasion.set(parseIsoDate(row.originalOccasionDate));
    this.dialogVisible.set(true);
  }

  save(): void {
    const name = this.formName().trim();
    const from = this.formFrom();
    const to = this.formTo();
    if (!name || !from || !to) {
      this.notify.warn('public_holidays_page.required');
      return;
    }
    const body = {
      name,
      fromDate: toYmd(from),
      toDate: toYmd(to),
      notes: this.formNotes().trim() || null,
      originalOccasionDate: this.formOccasion() ? toYmd(this.formOccasion()!) : null,
    };
    this.saving.set(true);
    const done = () => {
      this.saving.set(false);
      this.dialogVisible.set(false);
      this.notify.success('public_holidays_page.saved');
      this.load();
    };
    const fail = (err: unknown) => {
      this.saving.set(false);
      this.notify.error(err, 'public_holidays_page.save_failed');
    };
    if (this.editingId()) {
      this.api.updatePublicHoliday(this.editingId()!, body).subscribe({ next: done, error: fail });
    } else {
      this.api.createPublicHoliday(body).subscribe({ next: done, error: fail });
    }
  }

  remove(id: string): void {
    this.api.deletePublicHoliday(id).subscribe({
      next: () => {
        this.notify.success('public_holidays_page.deleted');
        this.load();
      },
      error: (err: unknown) => this.notify.error(err, 'public_holidays_page.delete_failed'),
    });
  }

  needsThisYearDates(row: PublicHolidayDto): boolean {
    const fromYear = Number((row.fromDate ?? '').slice(0, 4));
    return !!row.isMovable && row.status === PublicHolidayStatus.Draft && fromYear !== this.year();
  }

  downloadTemplate(): void {
    const ws = XLSX.utils.aoa_to_sheet(buildHolidayTemplateSheet(this.year()));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Holidays');
    XLSX.writeFile(wb, `official-holidays-template-${this.year()}.xlsx`);
  }

  exportYear(): void {
    const ws = XLSX.utils.aoa_to_sheet(buildHolidayExportRows(this.holidays()));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Holidays');
    XLSX.writeFile(wb, `official-holidays-${this.year()}.xlsx`);
  }

  openImport(): void {
    this.importPreview.set(null);
    this.importResolutions.set({});
    this.importRecalc.set(false);
    this.importVisible.set(true);
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const lower = file.name.toLowerCase();
    this.importing.set(true);
    const reader = new FileReader();
    reader.onerror = () => {
      this.importing.set(false);
      this.notify.errorText(this.translate.instant('public_holidays_page.file_read_failed'));
    };
    reader.onload = () => {
      try {
        const rows = lower.endsWith('.csv')
          ? parseHolidayImportCsv(String(reader.result ?? ''))
          : parseHolidayImportXlsx(reader.result as ArrayBuffer);
        this.api.previewPublicHolidaysImport(this.year(), toImportInputs(rows)).subscribe({
          next: (preview) => {
            this.importPreview.set(preview);
            const resolutions: Record<number, ImportResolution> = {};
            for (const row of preview.rows) {
              if (
                row.status === PublicHolidayImportRowStatus.Duplicate ||
                row.status === PublicHolidayImportRowStatus.Conflict
              ) {
                resolutions[row.sourceRow] = 'skip';
              }
            }
            this.importResolutions.set(resolutions);
            this.importing.set(false);
          },
          error: (err: unknown) => {
            this.importing.set(false);
            this.notify.error(err, 'public_holidays_page.preview_failed');
          },
        });
      } catch (err: unknown) {
        this.importing.set(false);
        this.notify.error(err, 'public_holidays_page.file_read_failed');
      }
    };
    if (lower.endsWith('.csv')) reader.readAsText(file, 'UTF-8');
    else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) reader.readAsArrayBuffer(file);
    else {
      this.importing.set(false);
      this.notify.warn('public_holidays_page.file_type');
    }
  }

  setResolution(sourceRow: number, value: ImportResolution): void {
    this.importResolutions.update((current) => ({ ...current, [sourceRow]: value }));
  }

  previewMessage(row: PublicHolidayImportPreviewRow): string {
    const ar = this.translate.currentLang?.toLowerCase().startsWith('ar');
    return (ar ? row.messageAr || row.message : row.message || row.messageAr) ?? '';
  }

  importStatusKey(status: PublicHolidayImportRowStatus): string {
    switch (status) {
      case PublicHolidayImportRowStatus.New:
        return 'public_holidays_page.status_new';
      case PublicHolidayImportRowStatus.Duplicate:
        return 'public_holidays_page.status_duplicate';
      case PublicHolidayImportRowStatus.Conflict:
        return 'public_holidays_page.status_conflict';
      default:
        return 'public_holidays_page.status_invalid';
    }
  }

  importStatusSeverity(status: PublicHolidayImportRowStatus): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case PublicHolidayImportRowStatus.New:
        return 'success';
      case PublicHolidayImportRowStatus.Duplicate:
        return 'info';
      case PublicHolidayImportRowStatus.Conflict:
        return 'warning';
      default:
        return 'danger';
    }
  }

  commitImport(): void {
    const preview = this.importPreview();
    if (!preview) return;
    const resolutions = this.importResolutions();
    const rows: PublicHolidayImportCommitRow[] = [];
    for (const row of preview.rows) {
      if (!this.canCommitRow(row, resolutions[row.sourceRow])) continue;
      if (!row.name || !row.fromDate || !row.toDate) continue;
      rows.push({
        name: row.name,
        fromDate: row.fromDate,
        toDate: row.toDate,
        notes: row.notes ?? null,
        originalOccasionDate: row.originalOccasionDate ?? null,
        existingHolidayId:
          row.status === PublicHolidayImportRowStatus.New ? null : row.existingHolidayId ?? null,
      });
    }
    if (!rows.length) {
      this.notify.warn('public_holidays_page.nothing_to_commit');
      return;
    }
    this.committing.set(true);
    this.api.commitPublicHolidaysImport(this.year(), rows, this.importRecalc()).subscribe({
      next: () => {
        this.committing.set(false);
        this.importVisible.set(false);
        this.notify.success('public_holidays_page.imported', { count: rows.length });
        this.load();
      },
      error: (err: unknown) => {
        this.committing.set(false);
        this.notify.error(err, 'public_holidays_page.commit_failed');
      },
    });
  }

  copyPreviousYear(): void {
    this.confirm.confirm({
      headerKey: 'public_holidays_page.copy_year',
      messageKey: 'public_holidays_page.copy_year_confirm',
      messageParams: { year: this.year(), previous: this.year() - 1 },
      accept: () => {
        this.copying.set(true);
        this.api.copyPreviousYearPublicHolidays(this.year()).subscribe({
          next: (result) => {
            this.copying.set(false);
            this.notify.success('public_holidays_page.copied', {
              created: result.created,
              skipped: result.skipped,
              movable: result.movable,
            });
            this.load();
          },
          error: (err: unknown) => {
            this.copying.set(false);
            this.notify.error(err, 'public_holidays_page.copy_failed');
          },
        });
      },
    });
  }

  openConfirm(target: ConfirmTarget): void {
    if (target.kind === 'one' && this.needsThisYearDates(target.row)) {
      this.notify.warn('public_holidays_page.movable_needs_dates');
      return;
    }
    this.confirmTarget.set(target);
    this.confirmRecalc.set(false);
    this.confirmVisible.set(true);
  }

  submitConfirm(): void {
    const target = this.confirmTarget();
    if (!target) return;
    this.confirming.set(true);
    const done = () => {
      this.confirming.set(false);
      this.confirmVisible.set(false);
      this.notify.success('public_holidays_page.confirmed');
      this.load();
    };
    const fail = (err: unknown) => {
      this.confirming.set(false);
      this.notify.error(err, 'public_holidays_page.confirm_failed');
    };
    if (target.kind === 'one') {
      this.api.confirmPublicHoliday(target.row.id, this.year(), this.confirmRecalc()).subscribe({
        next: done,
        error: fail,
      });
    } else {
      this.api.confirmFixedPublicHolidayDrafts(this.year(), this.confirmRecalc()).subscribe({
        next: done,
        error: fail,
      });
    }
  }

  private canCommitRow(row: PublicHolidayImportPreviewRow, resolution?: ImportResolution): boolean {
    if (row.status === PublicHolidayImportRowStatus.Invalid) return false;
    if (row.status === PublicHolidayImportRowStatus.New) return true;
    return resolution === 'replace';
  }
}
