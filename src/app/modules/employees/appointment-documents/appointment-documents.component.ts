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
import { MessageService } from 'primeng/api';
import { forkJoin, switchMap } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { FileUploadService } from '../../../core/services/file-upload.service';
import { Employee, EmployeeDocument, EmployeeDocumentType } from '../../../core/models/employee.model';
import {
  DOC_TYPE_FILTER_OPTIONS,
  DOC_TYPE_LABELS,
  DOC_TYPE_UPLOAD_OPTIONS,
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
    SharedTableComponent,
    DocumentPreviewDialogComponent,
  ],
  templateUrl: './appointment-documents.component.html',
  styleUrl: './appointment-documents.component.scss',
})
export class AppointmentDocumentsComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly fileUploadService = inject(FileUploadService);
  private readonly messageService = inject(MessageService);

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

  readonly typeOptions = DOC_TYPE_FILTER_OPTIONS;
  readonly uploadTypeOptions = DOC_TYPE_UPLOAD_OPTIONS;

  readonly employees = signal<Employee[]>([]);
  readonly employeeOptions = computed(() =>
    this.employees().map((e) => ({ label: e.fullName, value: e.id }))
  );

  readonly previewDownloadFileName = computed(() => {
    const doc = this.previewDocument();
    if (!doc) return '';
    const fromUrl = doc.fileUrl?.split('/').pop() || '';
    return doc.name || doc.documentNumber || fromUrl || 'document';
  });

  readonly documentRows = computed(() => {
    const list = this.employees();
    const rows: DocumentRow[] = [];
    for (const emp of list) {
      for (const doc of emp.documents || []) {
        rows.push({
          id: doc.id,
          employeeId: emp.id,
          employeeName: emp.fullName,
          type: doc.type,
          typeLabel: DOC_TYPE_LABELS[doc.type] ?? doc.type,
          name: doc.name || doc.documentNumber || doc.type,
          fileUrl: doc.fileUrl,
          uploadDate: doc.uploadDate,
          document: doc,
        });
      }
    }
    return rows;
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

  ngOnInit(): void {
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.employeeService.fetchAll().subscribe({
      next: (list) => {
        this.employees.set(list);
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
        summary: 'تنبيه',
        detail: 'لا يوجد ملف معاينة لهذا المستند.',
      });
      return;
    }
    this.previewDocument.set(row.document);
    this.documentPreviewVisible.set(true);
  }

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('ar-EG');
  }

  readonly columns: SharedTableColumn<DocumentRow>[] = [
    { id: 'employeeName', header: 'الموظف', field: 'employeeName' },
    { id: 'typeLabel', header: 'نوع المستند', field: 'typeLabel' },
    { id: 'name', header: 'اسم المستند', field: 'name' },
    { id: 'uploadDate', header: 'تاريخ الرفع', valueGetter: (row) => this.formatDate(row.uploadDate) },
  ];

  readonly actions: SharedTableAction<DocumentRow>[] = [
    {
      id: 'preview',
      icon: 'pi pi-eye',
      buttonClass: 'p-button-rounded p-button-text p-button-sm',
      disabled: (row) => !row.fileUrl?.trim() || isPlaceholderDocumentUrl(row.fileUrl),
      onClick: (row) => this.openPreview(row),
    },
  ];

  onUploadFile(event: { files?: File[] }): void {
    const files = event.files?.filter(Boolean) ?? [];
    const employeeId = this.uploadEmployeeId();
    const docType = this.uploadDocType();
    const documentTypeId = docType ? resolveDocumentTypeId(docType) : undefined;

    if (!files.length || !employeeId || !docType || !documentTypeId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'بيانات ناقصة',
        detail: 'اختر الموظف ونوع المستند وملفاً واحداً على الأقل.',
      });
      return;
    }

    if (this.uploading()) return;
    this.uploading.set(true);

    const displayName = this.uploadDocName().trim();
    const now = new Date();

    forkJoin(files.map((file) => this.fileUploadService.upload(file, 'employees/documents')))
      .pipe(
        switchMap((paths) => {
          const newDocs: EmployeeDocument[] = paths.map((path, index) => {
            const file = files[index];
            const name = truncateDocumentNumber(
              displayName || file.name || DOC_TYPE_LABELS[docType],
              DOC_TYPE_LABELS[docType]
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
            summary: 'تم الرفع',
            detail: 'تم رفع المستندات وربطها بسجل الموظف.',
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
