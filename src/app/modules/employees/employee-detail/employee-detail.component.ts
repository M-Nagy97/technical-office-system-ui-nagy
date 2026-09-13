import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { EmployeeService } from '../../../core/services/employee.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { Employee, EmployeeDocument } from '../../../core/models/employee.model';
import { Penalty, PenaltyType, PenaltyStatus } from '../../../core/models/penalty.model';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { DocumentPreviewDialogComponent } from '../../../shared/components/document-preview-dialog/document-preview-dialog.component';
import { isImageMediaUrl } from '../../../core/utils/media-url.util';

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  terminated: 'منتهي',
  retired: 'متقاعد',
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  permanent: 'دائم',
  temporary: 'مؤقت',
  contract: 'عقد',
};

const NATIONAL_ID_DOCUMENT_TYPE_ID = 'dce167b1-ee8f-4d86-bdd3-477446980566';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    TabViewModule,
    AvatarModule,
    TagModule,
    InputTextModule,
    ToastModule,
    TooltipModule,
    TranslateModule,
    SharedTableComponent,
    DocumentPreviewDialogComponent,
  ],
  providers: [MessageService],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.scss',
})
export class EmployeeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly penaltyService = inject(PenaltyService);
  private readonly messageService = inject(MessageService);

  readonly employee = signal<Employee | null>(null);
  readonly editingCode = signal(false);
  readonly codeDraft = signal('');
  readonly savingCode = signal(false);
  readonly loading = signal(true);
  readonly documentPreviewVisible = signal(false);
  readonly previewDocument = signal<EmployeeDocument | null>(null);
  readonly previewHeaderKey = signal('document_preview.default_header');
  readonly penaltyStats = signal<{ type: PenaltyType; count: number }[]>([]);
  readonly employeePenalties = signal<Penalty[]>([]);

  readonly nationalIdDocument = computed(() => this.findNationalIdDocument(this.employee()));

  readonly previewDownloadFileName = computed(() => {
    const emp = this.employee();
    const doc = this.previewDocument();
    const url = doc?.fileUrl ?? '';
    const code = emp?.employeeNumber?.trim() || emp?.nationalId || emp?.id || 'employee';
    const path = url.split('?')[0];
    const extMatch = path.match(/\.(png|jpe?g|gif|webp|bmp|pdf)$/i);
    const extRaw = extMatch?.[1]?.toLowerCase() ?? (isImageMediaUrl(url) ? 'jpg' : 'pdf');
    const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
    const docNumber = doc?.documentNumber?.trim() || doc?.name?.trim();
    return docNumber ? `${docNumber}.${ext}` : `document-${code}.${ext}`;
  });

  readonly employeePenaltyColumns: SharedTableColumn<Penalty>[] = [
    { id: 'penaltyNumber', header: 'رقم الجزاء', valueGetter: (p) => p.penaltyNumber },
    { id: 'type', header: 'النوع', valueGetter: (p) => this.getPenaltyTypeLabel(p.type) },
    { id: 'reason', header: 'السبب', valueGetter: (p) => p.reason },
    { id: 'incidentDate', header: 'تاريخ الواقعة', valueGetter: (p) => this.formatDate(p.incidentDate) },
    { id: 'status', header: 'الحالة', valueGetter: (p) => this.getPenaltyStatusLabel(p.status) },
  ];

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }

  getStatusSeverity(status: string): 'success' | 'warning' | 'danger' | 'secondary' {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      default:
        return 'secondary';
    }
  }

  getEmploymentTypeLabel(value: string): string {
    return EMPLOYMENT_TYPE_LABELS[value] ?? value;
  }

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('ar-EG');
  }

  formatDateOrDash(d?: Date | null): string {
    if (!d) return '—';
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) || dateObj.getTime() === 0 ? '—' : dateObj.toLocaleDateString('ar-EG');
  }

  getPenaltyTypeLabel(type: PenaltyType): string {
    return PenaltyService.getTypeLabel(type);
  }

  getPenaltyStatusLabel(status: PenaltyStatus): string {
    return PenaltyService.getStatusLabel(status);
  }

  openDocumentPreview(doc: EmployeeDocument | null, headerKey = 'document_preview.default_header'): void {
    if (!doc) return;
    this.previewDocument.set(doc);
    this.previewHeaderKey.set(headerKey);
    this.documentPreviewVisible.set(true);
  }

  openNatIdDialog(): void {
    this.openDocumentPreview(this.nationalIdDocument(), 'document_preview.national_id_header');
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.employeeService.getById(id).subscribe({
        next: (emp) => {
          this.employee.set(emp ?? null);
          this.penaltyStats.set(this.penaltyService.getStatsByEmployee(id));
          this.employeePenalties.set(this.penaltyService.getByEmployeeId(id));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          // Handle error
        }
      });
    } else {
      this.loading.set(false);
    }
  }

  startEditEmployeeCode(): void {
    const e = this.employee();
    if (!e) return;
    this.codeDraft.set(e.employeeNumber ?? '');
    this.editingCode.set(true);
  }

  cancelEditEmployeeCode(): void {
    this.editingCode.set(false);
  }

  saveEmployeeCode(): void {
    const e = this.employee();
    const code = this.codeDraft().trim();
    if (!e || !code) return;

    this.savingCode.set(true);
    this.employeeService.updateEmployeeCode(e.id, code).subscribe({
      next: () => {
        this.savingCode.set(false);
        this.editingCode.set(false);
        this.employee.update((emp) => emp ? { ...emp, employeeNumber: code } : emp);
        this.messageService.add({
          severity: 'success',
          summary: 'تم',
          detail: 'تم تحديث رقم الموظف (كود البصمة). أعد سحب البيانات من الجهاز.',
        });
      },
      error: () => {
        this.savingCode.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'خطأ',
          detail: 'تعذّر تحديث رقم الموظف (قد يكون مكرراً)',
        });
      },
    });
  }

  edit(): void {
    const e = this.employee();
    if (e) this.router.navigate(['/employees', e.id, 'edit']);
  }

  print(): void {
    window.print();
  }

  suspend(): void {
    const e = this.employee();
    if (e && e.status === 'active') {
      const updated: Employee = { ...e, status: 'suspended' };
      this.employeeService.update(e.id, updated).subscribe({
        next: () => {
          this.employee.set(updated);
          this.messageService.add({
            severity: 'success',
            summary: 'تم الإيقاف',
            detail: 'تم إيقاف الموظف بنجاح',
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || err?.message || 'تعذّر إيقاف الموظف',
          });
        },
      });
    }
  }

  archive(): void {
    const e = this.employee();
    if (e) {
      const updated: Employee = { ...e, status: 'terminated' };
      this.employeeService.update(e.id, updated).subscribe({
        next: () => {
          this.employee.set(updated);
          this.messageService.add({
            severity: 'success',
            summary: 'تمت الأرشفة',
            detail: 'تم إنهاء خدمة / أرشفة الموظف بنجاح',
          });
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'خطأ',
            detail: err?.error?.message || err?.message || 'تعذّر أرشفة الموظف',
          });
        },
      });
    }
  }

  private findNationalIdDocument(emp: Employee | null): EmployeeDocument | null {
    if (!emp?.documents?.length) return null;

    return (
      emp.documents.find(
        (d) =>
          (d.documentNumber && d.documentNumber === emp.nationalId) ||
          (d.name && d.name === emp.nationalId) ||
          d.documentTypeId === NATIONAL_ID_DOCUMENT_TYPE_ID
      ) || emp.documents[0] || null
    );
  }
}
