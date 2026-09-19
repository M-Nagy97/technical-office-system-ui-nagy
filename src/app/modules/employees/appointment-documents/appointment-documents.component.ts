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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
  getDocTypeLabel,
  resolveDocumentTypeId,
  truncateDocumentNumber,
} from '../../../core/mappers/employee-document-types';
import { isPlaceholderDocumentUrl } from '../../../core/utils/media-url.util';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
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
    ConfirmDialogModule,
    TranslateModule,
    SharedTableComponent,
    DocumentPreviewDialogComponent,
  ],
  providers: [ConfirmationService],
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
      buttonClass: 'p-button-rounded p-button-text p-button-danger p-button-sm',
      onClick: (row) => this.confirmDelete(row),
    },
  ];

  ngOnInit(): void {
    this.rebuildLocalized();
    this.translate.onLangChange.subscribe(() => {
      this.rebuildLocalized();
      // Refresh computed type labels by reassigning dto list
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
    this.uploadDialogVisible.set(true);
  }

  closeUpload(): void {
    this.uploadDialogVisible.set(false);
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

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString(this.dateLocale());
  }

  onUploadFile(event: { files?: File[] }): void {
    const files = event.files?.filter(Boolean) ?? [];
    const employeeId = this.uploadEmployeeId();
    const docType = this.uploadDocType();
    const documentTypeId = docType ? resolveDocumentTypeId(docType) : undefined;

    if (!files.length || !employeeId || !docType || !documentTypeId) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('employees.documents.missing_data_summary'),
        detail: this.translate.instant('employees.documents.missing_data_detail'),
      });
      return;
    }

    if (this.uploading()) return;
    this.uploading.set(true);

    const displayName = this.uploadDocName().trim();
    const now = new Date();
    const typeLabel = getDocTypeLabel(docType, this.translate);

    forkJoin(files.map((file) => this.fileUploadService.upload(file, 'employees/documents')))
      .pipe(
        switchMap((paths) => {
          const newDocs: EmployeeDocument[] = paths.map((path, index) => {
            const file = files[index];
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
              uploadDate: now,
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
