import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import {
  CrudDialogComponent,
  FormFieldComponent,
  NotifyService,
  PageHeaderComponent,
  SharedTableAction,
  SharedTableCellTemplateDirective,
  SharedTableColumn,
  SharedTableComponent,
  tableViewAction,
} from '../../../shared';
import { CustodyApiService } from '../../../core/services/custody-api.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import {
  CustodyDocumentStatus,
  CustodyDocumentSummaryDto,
  CustodyDocumentType,
  CreateDocumentPayload,
} from '../../../core/models/custody.models';
import { catchError, finalize, of } from 'rxjs';

@Component({
  selector: 'app-documents-custody-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    TagModule,
    DropdownModule,
    InputTextModule,
    CalendarModule,
    HasPermissionDirective,
    PageHeaderComponent,
    SharedTableComponent,
    SharedTableCellTemplateDirective,
    CrudDialogComponent,
    FormFieldComponent,
  ],
  templateUrl: './documents-custody-list.component.html',
  styleUrl: './documents-custody-list.component.scss',
})
export class DocumentsCustodyListComponent implements OnInit {
  private readonly custodyApi = inject(CustodyApiService);
  private readonly employeeService = inject(EmployeeService);
  private readonly notify = inject(NotifyService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly rows = signal<CustodyDocumentSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly employees = signal<Employee[]>([]);
  createVisible = false;

  newTitle = '';
  newDocType: CustodyDocumentType = CustodyDocumentType.Contract;
  newToEmployeeId: string | null = null;
  newDate: Date = new Date();
  newNotes = '';

  docTypeOptions: { label: string; value: CustodyDocumentType }[] = [];

  readonly CustodyDocumentStatus = CustodyDocumentStatus;

  readonly columns: SharedTableColumn<CustodyDocumentSummaryDto>[] = [
    { id: 'title', header: 'custody.col.title', field: 'title' },
    { id: 'documentType', header: 'custody.col.doc_type' },
    { id: 'status', header: 'custody.col.status' },
    { id: 'custodian', header: 'custody.col.custodian', valueGetter: (row) => this.employeeName(row.currentCustodianEmployeeId) },
  ];

  readonly actions: SharedTableAction<CustodyDocumentSummaryDto>[] = [
    tableViewAction((row) => {
      if (!row.id) return;
      this.router.navigate(['/custody/documents', row.id]);
    }),
  ];

  ngOnInit(): void {
    this.refreshDocTypeOptions();
    this.translate.onLangChange.subscribe(() => this.refreshDocTypeOptions());

    this.employeeService.fetchAll().subscribe({
      next: (list) => {
        this.employees.set(list);
        this.reload();
      },
      error: (error) => this.notify.error(error, 'common.load_error'),
    });
  }

  private refreshDocTypeOptions(): void {
    this.docTypeOptions = [
      { label: this.translate.instant('custody.doc_type.contract'), value: CustodyDocumentType.Contract },
      { label: this.translate.instant('custody.doc_type.check'), value: CustodyDocumentType.Check },
      { label: this.translate.instant('custody.doc_type.letter'), value: CustodyDocumentType.Letter },
      { label: this.translate.instant('custody.doc_type.other'), value: CustodyDocumentType.Other },
    ];
  }

  readonly employeeOptions = () =>
    this.employees().map((e) => ({ label: `${e.employeeNumber} — ${e.fullName}`, value: e.id }));

  employeeName(id: string | null | undefined): string {
    if (!id) return '—';
    const e = this.employees().find((x) => x.id === id);
    return e ? e.fullName : id;
  }

  reload(): void {
    this.loading.set(true);
    this.custodyApi
      .getActiveDocuments()
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((err: Error) => {
          this.notify.error(err, 'common.load_error');
          return of([]);
        })
      )
      .subscribe((list) => this.rows.set(list));
  }

  openCreate(): void {
    this.newTitle = '';
    this.newDocType = CustodyDocumentType.Contract;
    this.newToEmployeeId = null;
    this.newDate = new Date();
    this.newNotes = '';
    this.createVisible = true;
  }

  submitCreate(): void {
    if (!this.newTitle.trim()) {
      this.notify.warn('custody.validation_title');
      return;
    }
    const payload: CreateDocumentPayload = {
      title: this.newTitle.trim(),
      documentType: this.newDocType,
      initialNotes: this.newNotes || null,
    };
    if (this.newToEmployeeId) {
      payload.initialToEmployeeId = this.newToEmployeeId;
      payload.initialTransactionDate = this.newDate.toISOString();
    }
    this.loading.set(true);
    this.custodyApi
      .createDocument(payload)
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((err: Error) => {
          this.notify.error(err, 'common.load_error');
          return of(null);
        })
      )
      .subscribe((id) => {
        if (id) {
          this.notify.success('common.create_success');
          this.createVisible = false;
          this.reload();
        }
      });
  }

  docTypeLabel(t: CustodyDocumentType): string {
    const keys: Record<CustodyDocumentType, string> = {
      [CustodyDocumentType.Contract]: 'custody.doc_type.contract',
      [CustodyDocumentType.Check]: 'custody.doc_type.check',
      [CustodyDocumentType.Letter]: 'custody.doc_type.letter',
      [CustodyDocumentType.Other]: 'custody.doc_type.other',
    };
    return keys[t] ?? String(t);
  }

  statusLabel(s: CustodyDocumentStatus): string {
    const keys: Record<CustodyDocumentStatus, string> = {
      [CustodyDocumentStatus.InProgress]: 'custody.status.in_progress',
      [CustodyDocumentStatus.Completed]: 'custody.status.completed',
      [CustodyDocumentStatus.Cancelled]: 'custody.status.cancelled',
    };
    return keys[s] ?? String(s);
  }

  statusSeverity(s: CustodyDocumentStatus):
    | 'success'
    | 'secondary'
    | 'info'
    | 'warning'
    | 'danger'
    | 'contrast' {
    if (s === CustodyDocumentStatus.InProgress) return 'info';
    if (s === CustodyDocumentStatus.Completed) return 'success';
    return 'warning';
  }
}
