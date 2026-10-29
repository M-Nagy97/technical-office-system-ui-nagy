import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, switchMap } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import {
  DocumentEmployeeDto,
  DocumentEmployeeService,
} from '../../../core/services/document-employee.service';
import { Employee, EmployeeDocument, EmployeeDocumentType } from '../../../core/models/employee.model';
import {
  buildDocTypeFilterOptions,
  buildDocTypeUploadOptions,
  defaultExpiryFromIssue,
  getDocTypeLabel,
  isDocumentActive,
  isDocumentExpired,
  isSameLocalDay,
  resolveDocumentTypeId,
  startOfLocalDay,
  truncateDocumentNumber,
} from '../../../core/mappers/employee-document-types';
import { isPlaceholderDocumentUrl } from '../../../core/utils/media-url.util';
import {
  SharedTableCellTemplateDirective,
  SharedTableComponent,
} from '../../../shared';
import { SharedTableAction, SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { DocumentPreviewDialogComponent } from '../../../shared/components/document-preview-dialog/document-preview-dialog.component';

export interface DocumentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  type: EmployeeDocumentType;
  typeLabel: string;
  name: string;
  fileUrl: string;
  uploadDate: Date;
  expiryDate?: Date;
  document: EmployeeDocument;
}

@Component({
  selector: 'app-appointment-documents',
  standalone: true,
  imports: [
    FormsModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    DialogModule,
    FileUploadModule,
    InputTextModule,
    TooltipModule,
    RippleModule,
    MessageModule,
    TagModule,
    TranslateModule,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    DocumentPreviewDialogComponent,
  ],
  templateUrl: './appointment-documents.component.html',
  styleUrl: './appointment-documents.component.scss',
})
export class AppointmentDocumentsComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly documentEmployeeService = inject(DocumentEmployeeService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  readonly employeeFilter = signal<string | null>(null);
  readonly typeFilter = signal<string | null>(null);
  readonly dateRange = signal<[Date | null, Date | null]>([null, null]);
  readonly uploadDialogVisible = signal(false);
  readonly documentPreviewVisible = signal(false);
  readonly previewDocument = signal<EmployeeDocument | null>(null);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly uploadEmployeeId = signal<string | null>(null);
  readonly uploadDocType = signal<EmployeeDocumentType | null>(null);
  readonly uploadDocName = signal('');
  readonly uploadIssueDate = signal<Date | null>(new Date());
  readonly uploadExpiryDate = signal<Date | null>(null);
  readonly uploadWidgetKey = signal(1);

  private lastAutoExpiry: Date | null = null;

  typeOptions: { label: string; value: EmployeeDocumentType }[] = [];
  uploadTypeOptions: { label: string; value: EmployeeDocumentType }[] = [];

  readonly employees = signal<Employee[]>([]);
  readonly documentDtos = signal<DocumentEmployeeDto[]>([]);

  readonly employeeOptions = computed(() =>
    this.employees().map((e) => ({ label: e.fullName, value: e.id }))
  );

  readonly employeeNameById = computed(() => {
    const map = new Map<string, string>();
    for (const emp of this.employees()) {
      map.set(emp.id, emp.fullName);
    }
    return map;
  });

  readonly previewDownloadFileName = computed(() => {
    const doc = this.previewDocument();
    if (!doc) return '';
    const fromUrl = doc.fileUrl?.split('/').pop() || '';
    return doc.name || doc.documentNumber || fromUrl || 'document';
  });

  readonly isNationalIdUpload = computed(() => this.uploadDocType() === 'id_copy');

  readonly nationalIdDocsForEmployee = computed(() => {
    const employeeId = this.uploadEmployeeId();
    if (!employeeId || this.uploadDocType() !== 'id_copy') return [];
    return this.documentRows().filter((row) => row.employeeId === employeeId && row.type === 'id_copy');
  });

  readonly activeNationalIdConflict = computed(() => {
    const matches = this.nationalIdDocsForEmployee();
    return matches.find((row) => isDocumentActive(row.expiryDate)) ?? null;
  });

  readonly expiredNationalIdNotice = computed(() => {
    if (this.activeNationalIdConflict()) return null;
    const expired = this.nationalIdDocsForEmployee().filter((row) => isDocumentExpired(row.expiryDate));
    if (!expired.length) return null;
    return [...expired].sort(
      (a, b) => this.dateTime(b.expiryDate) - this.dateTime(a.expiryDate)
    )[0];
  });

  readonly uploadDisabled = computed(
    () => this.uploading() || !!this.activeNationalIdConflict()
  );

  readonly documentRows = computed(() => {
    const nameById = this.employeeNameById();
    return this.documentDtos().map((dto, index) => {
      const document = this.documentEmployeeService.toDomain(dto, index);
      const employeeId = dto.employeeId || '';
      return {
        id: document.id,
        employeeId,
        employeeName: nameById.get(employeeId) || employeeId || '—',
        type: document.type,
        typeLabel: getDocTypeLabel(document.type, this.translate),
        name: document.name || document.documentNumber || document.type,
        fileUrl: document.fileUrl,
        uploadDate: document.uploadDate,
        expiryDate: document.expiryDate,
        document,
      } satisfies DocumentRow;
    });
  });

  readonly filteredRows = computed(() => {
    let rows = this.documentRows();
    const empId = this.employeeFilter();
    if (empId) rows = rows.filter((r) => r.employeeId === empId);
    const type = this.typeFilter();
    if (type) rows = rows.filter((r) => r.type === type);
    const [from, to] = this.dateRange();
    if (from) rows = rows.filter((r) => new Date(r.uploadDate) >= from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => new Date(r.uploadDate) <= end);
    }
    return rows;
  });

  columns: SharedTableColumn<DocumentRow>[] = [];

  readonly actions: SharedTableAction<DocumentRow>[] = [
    {
      id: 'preview',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      disabled: (row) => !row.fileUrl?.trim() || isPlaceholderDocumentUrl(row.fileUrl),
      onClick: (row) => this.openPreview(row),
    },
    {
      id: 'delete',
      icon: 'pi pi-trash',
      buttonClass: 'p-button-rounded p-button-text p-button-sm p-button-danger',
      onClick: (row) => this.confirmDelete(row),
    },
  ];

  ngOnInit(): void {
    this.rebuildLocalized();
    this.translate.onLangChange.subscribe(() => {
      this.rebuildLocalized();
      this.documentDtos.update((list) => [...list]);
    });
    this.loadDocuments();
  }

  private rebuildLocalized(): void {
    this.typeOptions = buildDocTypeFilterOptions(this.translate);
    this.uploadTypeOptions = buildDocTypeUploadOptions(this.translate);
    this.columns = [
      { id: 'employeeName', header: 'employees.documents.col_employee', field: 'employeeName' },
      { id: 'typeLabel', header: 'employees.documents.col_type', field: 'typeLabel' },
      { id: 'name', header: 'employees.documents.col_name', field: 'name' },
      {
        id: 'uploadDate',
        header: 'employees.documents.col_upload_date',
        valueGetter: (row) => this.formatDate(row.uploadDate),
      },
      {
        id: 'expiryDate',
        header: 'employees.documents.col_expiry_date',
        valueGetter: (row) => (row.expiryDate ? this.formatDate(row.expiryDate) : '—'),
      },
      { id: 'status', header: 'employees.documents.col_status' },
    ];
  }

  private loadDocuments(): void {
    this.loading.set(true);
    forkJoin({
      employees: this.employeeService.fetchAll(),
      documents: this.documentEmployeeService.list(),
    }).subscribe({
      next: ({ employees, documents }) => {
        this.employees.set(employees);
        this.documentDtos.set(documents || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openUpload(): void {
    this.uploadEmployeeId.set(null);
    this.uploadDocType.set(null);
    this.uploadDocName.set('');
    this.uploadIssueDate.set(startOfLocalDay(new Date()));
    this.uploadExpiryDate.set(null);
    this.lastAutoExpiry = null;
    this.uploadWidgetKey.update((key) => key + 1);
    this.uploadDialogVisible.set(true);
  }

  closeUpload(): void {
    this.uploadDialogVisible.set(false);
  }

  onUploadEmployeeChange(employeeId: string | null): void {
    this.uploadEmployeeId.set(employeeId);
  }

  onUploadDocTypeChange(type: EmployeeDocumentType | null): void {
    this.uploadDocType.set(type);
    this.lastAutoExpiry = null;
    this.applyDefaultExpiry();
    this.uploadWidgetKey.update((key) => key + 1);
  }

  onUploadIssueDateChange(date: Date | null): void {
    this.uploadIssueDate.set(date);
    const currentExpiry = this.uploadExpiryDate();
    if (!currentExpiry || isSameLocalDay(currentExpiry, this.lastAutoExpiry)) {
      this.applyDefaultExpiry();
    }
  }

  onUploadExpiryDateChange(date: Date | null): void {
    this.uploadExpiryDate.set(date);
    if (!isSameLocalDay(date, this.lastAutoExpiry)) {
      this.lastAutoExpiry = null;
    }
  }

  private applyDefaultExpiry(): void {
    const type = this.uploadDocType();
    const issue = this.uploadIssueDate();
    const expiry = type && issue ? defaultExpiryFromIssue(issue, type) : null;
    this.uploadExpiryDate.set(expiry);
    this.lastAutoExpiry = expiry;
  }

  rowStatusKey(row: DocumentRow): string {
    return isDocumentExpired(row.expiryDate)
      ? 'employees.documents.status_expired'
      : 'employees.documents.status_active';
  }

  rowStatusSeverity(row: DocumentRow): 'success' | 'danger' {
    return isDocumentExpired(row.expiryDate) ? 'danger' : 'success';
  }

  openPreview(row: DocumentRow): void {
    if (!row.fileUrl?.trim() || isPlaceholderDocumentUrl(row.fileUrl)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('employees.documents.preview_warn_summary'),
        detail: this.translate.instant('employees.documents.preview_warn_detail'),
      });
      return;
    }
    this.previewDocument.set(row.document);
    this.documentPreviewVisible.set(true);
  }

  confirmDelete(row: DocumentRow): void {
    this.confirmationService.confirm({
      message: this.translate.instant('employees.documents.delete_confirm_msg', { name: row.name }),
      header: this.translate.instant('employees.documents.delete_confirm_header'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('employees.documents.delete_accept'),
      rejectLabel: this.translate.instant('employees.documents.delete_reject'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteDocument(row),
    });
  }

  private deleteDocument(row: DocumentRow): void {
    if (!row.id || !row.employeeId) return;
    this.documentEmployeeService.delete(row.id, row.employeeId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('employees.documents.delete_success_summary'),
          detail: this.translate.instant('employees.documents.delete_success_detail'),
        });
        this.loadDocuments();
      },
    });
  }

  private dateLocale(): string {
    return this.translate.currentLang === 'en' ? 'en-US' : 'ar-EG';
  }

  formatDate(d: Date | string | number | null | undefined): string {
    if (d == null) return '—';
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(this.dateLocale());
  }

  private dateTime(value: Date | string | number | null | undefined): number {
    if (value == null) return 0;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  onUploadFile(event: { files?: File[] }): void {
    const files = event.files?.filter(Boolean) ?? [];
    const employeeId = this.uploadEmployeeId();
    const docType = this.uploadDocType();
    const documentTypeId = docType ? resolveDocumentTypeId(docType) : undefined;
    const issueDate = this.uploadIssueDate();
    const expiryDate = this.uploadExpiryDate();

    if (!files.length || !employeeId || !docType || !documentTypeId || !issueDate) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('employees.documents.missing_data_summary'),
        detail: this.translate.instant('employees.documents.missing_data_detail'),
      });
      return;
    }

    if (this.activeNationalIdConflict()) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('employees.documents.missing_data_summary'),
        detail: this.translate.instant('employees.documents.active_natid_warning', {
          date: this.formatDate(this.activeNationalIdConflict()!.expiryDate),
        }),
      });
      return;
    }

    if (!expiryDate) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('employees.documents.missing_data_summary'),
        detail: this.translate.instant('employees.documents.expiry_required'),
      });
      return;
    }

    if (startOfLocalDay(expiryDate) < startOfLocalDay(issueDate)) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('employees.documents.missing_data_summary'),
        detail: this.translate.instant('employees.documents.expiry_before_issue'),
      });
      return;
    }

    const filesToUpload = docType === 'id_copy' ? files.slice(0, 1) : files;

    if (this.uploading()) return;
    this.uploading.set(true);

    const displayName = this.uploadDocName().trim();
    const typeLabel = getDocTypeLabel(docType, this.translate);

    forkJoin(filesToUpload.map((file) => this.fileUploadService.upload(file, 'employees/documents')))
      .pipe(
        switchMap((paths) => {
          const newDocs: EmployeeDocument[] = paths.map((path, index) => {
            const file = filesToUpload[index];
            const name = truncateDocumentNumber(
              displayName || file.name || typeLabel,
              typeLabel
            );
            return {
              id: `doc-${Date.now()}-${index}`,
              type: docType,
              documentTypeId,
              name,
              documentNumber: name,
              fileUrl: path,
              uploadDate: issueDate,
              expiryDate,
            };
          });
          return this.employeeService.addDocuments(employeeId, newDocs);
        })
      )
      .subscribe({
        next: () => {
          this.uploading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('employees.documents.upload_success_summary'),
            detail: this.translate.instant('employees.documents.upload_success_detail'),
          });
          this.closeUpload();
          this.loadDocuments();
        },
        error: () => {
          this.uploading.set(false);
        },
      });
  }
}
