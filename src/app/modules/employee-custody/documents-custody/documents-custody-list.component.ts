import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { MessageService } from 'primeng/api';
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
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    CalendarModule,
  ],
  templateUrl: './documents-custody-list.component.html',
  styleUrl: './documents-custody-list.component.scss',
})
export class DocumentsCustodyListComponent implements OnInit {
  private readonly custodyApi = inject(CustodyApiService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

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

  ngOnInit(): void {
    this.refreshDocTypeOptions();
    this.translate.onLangChange.subscribe(() => this.refreshDocTypeOptions());

    this.employeeService.fetchAll().subscribe({
      next: (list) => {
        this.employees.set(list);
        this.reload();
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load employees',
        }),
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
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
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
      this.messageService.add({
        severity: 'warning',
        summary: 'Validation',
        detail: this.translate.instant('custody.validation_title'),
      });
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
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          return of(null);
        })
      )
      .subscribe((id) => {
        if (id) {
          this.messageService.add({ severity: 'success', summary: 'OK', detail: id });
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
