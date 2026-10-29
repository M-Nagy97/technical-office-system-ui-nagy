import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabViewModule } from 'primeng/tabview';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { ConfirmService, DetailHeaderComponent } from '../../../shared';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentEmployeeService } from '../../../core/services/document-employee.service';
import { PenaltyService } from '../../../core/services/penalty.service';
import { Employee, EmployeeDocument } from '../../../core/models/employee.model';
import { pickCurrentNationalIdDocument } from '../../../core/mappers/employee-document-types';
import { Penalty, PenaltyType, PenaltyStatus } from '../../../core/models/penalty.model';
import { SharedTableComponent } from '../../../shared/components/shared-table/shared-table.component';
import { SharedTableColumn } from '../../../shared/components/shared-table/shared-table.models';
import { DocumentPreviewDialogComponent } from '../../../shared/components/document-preview-dialog/document-preview-dialog.component';
import { isImageMediaUrl } from '../../../core/utils/media-url.util';
import { switchMap, of } from 'rxjs';

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
    TooltipModule,
    TranslateModule,
    HasPermissionDirective,
    SharedTableComponent,
    DocumentPreviewDialogComponent,
    DetailHeaderComponent,
  ],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.scss',
})
export class EmployeeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly documentEmployeeService = inject(DocumentEmployeeService);
  private readonly penaltyService = inject(PenaltyService);
  private readonly messageService = inject(MessageService);
  private readonly confirm = inject(ConfirmService);
  private readonly translate = inject(TranslateService);

  readonly employee = signal<Employee | null>(null);
  readonly documents = signal<EmployeeDocument[]>([]);
  readonly editingCode = signal(false);
  readonly codeDraft = signal('');
  readonly savingCode = signal(false);
  readonly loading = signal(true);
  readonly documentPreviewVisible = signal(false);
  readonly previewDocument = signal<EmployeeDocument | null>(null);
  readonly previewHeaderKey = signal('document_preview.default_header');
  readonly penaltyStats = signal<{ type: PenaltyType; count: number }[]>([]);
  readonly employeePenalties = signal<Penalty[]>([]);

  readonly nationalIdDocument = computed(() =>
    this.findNationalIdDocument(this.employee(), this.documents())
  );

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

  employeePenaltyColumns: SharedTableColumn<Penalty>[] = [];

  ngOnInit(): void {
    this.rebuildPenaltyColumns();
    this.translate.onLangChange.subscribe(() => {
      this.rebuildPenaltyColumns();
      this.employeePenalties.update((list) => [...list]);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.employeeService
        .getById(id)
        .pipe(
          switchMap((emp) => {
            this.employee.set(emp ?? null);
            this.penaltyStats.set(this.penaltyService.getStatsByEmployee(id));
            this.employeePenalties.set(this.penaltyService.getByEmployeeId(id));
            if (!emp) return of([] as EmployeeDocument[]);
            return this.documentEmployeeService
              .list(id)
              .pipe(switchMap((dtos) => of(this.documentEmployeeService.toDomainList(dtos))));
          })
        )
        .subscribe({
          next: (docs) => {
            this.documents.set(docs);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          },
        });
    } else {
      this.loading.set(false);
    }
  }

  private rebuildPenaltyColumns(): void {
    this.employeePenaltyColumns = [
      {
        id: 'penaltyNumber',
        header: 'employees.detail.col_penalty_number',
        valueGetter: (p) => p.penaltyNumber,
      },
      {
        id: 'type',
        header: 'employees.detail.col_type',
        valueGetter: (p) => this.getPenaltyTypeLabel(p.type),
      },
      {
        id: 'reason',
        header: 'employees.detail.col_reason',
        valueGetter: (p) => p.reason,
      },
      {
        id: 'incidentDate',
        header: 'employees.detail.col_incident_date',
        valueGetter: (p) => this.formatDate(p.incidentDate),
      },
      {
        id: 'status',
        header: 'employees.detail.col_status',
        valueGetter: (p) => this.getPenaltyStatusLabel(p.status),
      },
    ];
  }

  private dateLocale(): string {
    return this.translate.currentLang === 'en' ? 'en-US' : 'ar-EG';
  }

  statusLabelKey(status: string): string {
    return `employees.status.${status}`;
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

  employmentTypeLabelKey(value: string): string {
    return `employees.employment_type.${value}`;
  }

  genderLabelKey(gender: string): string {
    return gender === 'female' ? 'employees.gender.female' : 'employees.gender.male';
  }

  formatDate(d: Date): string {
    return new Date(d).toLocaleDateString(this.dateLocale());
  }

  formatDateOrDash(d?: Date | null): string {
    if (!d) return '—';
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) || dateObj.getTime() === 0
      ? '—'
      : dateObj.toLocaleDateString(this.dateLocale());
  }

  getPenaltyTypeLabel(type: PenaltyType): string {
    return this.translate.instant(`employees.penalty_type.${type}`);
  }

  getPenaltyStatusLabel(status: PenaltyStatus): string {
    return this.translate.instant(`employees.penalty_status.${status}`);
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

  confirmDeleteDocument(doc: EmployeeDocument): void {
    const emp = this.employee();
    if (!emp) return;
    this.confirm.confirm({
      headerKey: 'employees.detail.delete_doc_confirm_header',
      messageKey: 'employees.detail.delete_doc_confirm_msg',
      messageParams: { name: doc.name || doc.documentNumber || '' },
      accept: () => {
        this.documentEmployeeService.delete(doc.id, emp.id).subscribe({
          next: () => {
            this.documents.update((list) => list.filter((d) => d.id !== doc.id));
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('employees.detail.delete_success_summary'),
              detail: this.translate.instant('employees.detail.delete_success_detail'),
            });
          },
        });
      },
    });
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
        this.employee.update((emp) => (emp ? { ...emp, employeeNumber: code } : emp));
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('employees.detail.code_update_summary'),
          detail: this.translate.instant('employees.detail.code_update_detail'),
        });
      },
      error: () => {
        this.savingCode.set(false);
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
    if (!e || e.status !== 'active') return;
    this.confirm.confirm({
      headerKey: 'employees.detail.suspend_confirm_header',
      messageKey: 'employees.detail.suspend_confirm_msg',
      accept: () => {
        const updated: Employee = { ...e, status: 'suspended' };
        this.employeeService.update(e.id, updated).subscribe({
          next: () => {
            this.employee.set(updated);
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('employees.detail.suspend_success_summary'),
              detail: this.translate.instant('employees.detail.suspend_success_detail'),
            });
          },
          error: () => {},
        });
      },
    });
  }

  archive(): void {
    const e = this.employee();
    if (!e || e.status === 'terminated') return;
    this.confirm.confirm({
      headerKey: 'employees.detail.archive_confirm_header',
      messageKey: 'employees.detail.archive_confirm_msg',
      accept: () => {
        const updated: Employee = { ...e, status: 'terminated' };
        this.employeeService.update(e.id, updated).subscribe({
          next: () => {
            this.employee.set(updated);
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('employees.detail.archive_success_summary'),
              detail: this.translate.instant('employees.detail.archive_success_detail'),
            });
          },
          error: () => {},
        });
      },
    });
  }

  restore(): void {
    const e = this.employee();
    if (!e || e.status !== 'terminated') return;
    this.confirm.confirm({
      headerKey: 'employees.detail.restore_confirm_header',
      messageKey: 'employees.detail.restore_confirm_msg',
      accept: () => {
        const updated: Employee = { ...e, status: 'active' };
        this.employeeService.update(e.id, updated).subscribe({
          next: () => {
            this.employee.set(updated);
            this.messageService.add({
              severity: 'success',
              summary: this.translate.instant('employees.detail.restore_success_summary'),
              detail: this.translate.instant('employees.detail.restore_success_detail'),
            });
          },
          error: () => {},
        });
      },
    });
  }

  private findNationalIdDocument(
    emp: Employee | null,
    docs: EmployeeDocument[]
  ): EmployeeDocument | null {
    if (!emp) return null;
    return pickCurrentNationalIdDocument(docs, emp.nationalId);
  }
}
