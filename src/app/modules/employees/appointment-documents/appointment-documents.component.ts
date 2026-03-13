import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';

export interface DocumentRow {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  typeLabel: string;
  name: string;
  fileUrl: string;
  uploadDate: Date;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  appointment_decision: 'قرار التعيين',
  id_copy: 'صورة البطاقة',
  birth_certificate: 'شهادة الميلاد',
  qualification: 'المؤهل',
  other: 'أخرى',
};

@Component({
  selector: 'app-appointment-documents',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    DropdownModule,
    CalendarModule,
    DialogModule,
    FileUploadModule,
    TooltipModule,
    RippleModule,
  ],
  templateUrl: './appointment-documents.component.html',
  styleUrl: './appointment-documents.component.scss',
})
export class AppointmentDocumentsComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);

  readonly employeeFilter = signal<string | null>(null);
  readonly typeFilter = signal<string | null>(null);
  readonly dateRange = signal<[Date | null, Date | null]>([null, null]);
  readonly uploadDialogVisible = signal(false);
  readonly previewDialogVisible = signal(false);
  readonly previewDoc = signal<DocumentRow | null>(null);

  readonly typeOptions = [
    { label: 'قرار التعيين', value: 'appointment_decision' },
    { label: 'صورة البطاقة', value: 'id_copy' },
    { label: 'شهادة الميلاد', value: 'birth_certificate' },
    { label: 'المؤهل', value: 'qualification' },
    { label: 'أخرى', value: 'other' },
  ];

  readonly employees = signal<Employee[]>([]);
  readonly employeeOptions = computed(() =>
    this.employees().map((e) => ({ label: e.fullName, value: e.id }))
  );

  readonly documentRows = computed(() => {
    const list = this.employeeService.getList();
    const rows: DocumentRow[] = [];
    for (const emp of list) {
      for (const doc of emp.documents || []) {
        rows.push({
          id: doc.id,
          employeeId: emp.id,
          employeeName: emp.fullName,
          type: doc.type,
          typeLabel: DOC_TYPE_LABELS[doc.type] ?? doc.type,
          name: doc.name,
          fileUrl: doc.fileUrl,
          uploadDate: doc.uploadDate,
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
    if (to) rows = rows.filter((r) => new Date(r.uploadDate) <= to);
    return rows;
  });

  ngOnInit(): void {
    this.employeeService.getAll().subscribe((list: Employee[]) => this.employees.set(list));
  }

  openUpload(): void {
    this.uploadDialogVisible.set(true);
  }

  closeUpload(): void {
    this.uploadDialogVisible.set(false);
  }

  openPreview(row: DocumentRow): void {
    this.previewDoc.set(row);
    this.previewDialogVisible.set(true);
  }

  closePreview(): void {
    this.previewDialogVisible.set(false);
    this.previewDoc.set(null);
  }

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('ar-EG');
  }

  onUploadFile(): void {
    // Placeholder: add document to selected employee
    this.closeUpload();
  }
}
