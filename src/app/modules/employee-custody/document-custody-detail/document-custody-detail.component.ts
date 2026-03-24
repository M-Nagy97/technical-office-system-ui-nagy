import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { CalendarModule } from 'primeng/calendar';
import { MessageService } from 'primeng/api';
import { CustodyApiService } from '../../../core/services/custody-api.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.model';
import {
  DocumentTransactionAction,
  DocumentTransactionDto,
} from '../../../core/models/custody.models';
import { catchError, finalize, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-document-custody-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslatePipe,
    CardModule,
    ButtonModule,
    TableModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    CalendarModule,
  ],
  templateUrl: './document-custody-detail.component.html',
  styleUrl: './document-custody-detail.component.scss',
})
export class DocumentCustodyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly custodyApi = inject(CustodyApiService);
  private readonly employeeService = inject(EmployeeService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  documentId = '';
  readonly history = signal<DocumentTransactionDto[]>([]);
  readonly loading = signal(false);
  readonly employees = signal<Employee[]>([]);
  readonly isActive = signal(false);

  transferVisible = false;
  completeVisible = false;

  transferAction: DocumentTransactionAction = DocumentTransactionAction.Deliver;
  transferFromId: string | null = null;
  transferToId: string | null = null;
  transferDate: Date = new Date();
  transferNotes = '';

  completeDate: Date = new Date();
  completeById: string | null = null;
  completeNotes = '';

  actionOptions: { label: string; value: DocumentTransactionAction }[] = [];

  ngOnInit(): void {
    this.refreshActionOptions();
    this.translate.onLangChange.subscribe(() => this.refreshActionOptions());

    this.documentId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.documentId) {
      void this.router.navigate(['/custody/documents']);
      return;
    }

    this.employeeService.fetchAll().subscribe({
      next: (list) => {
        this.employees.set(list);
        this.load();
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load employees',
        }),
    });
  }

  private refreshActionOptions(): void {
    this.actionOptions = [
      { label: this.translate.instant('custody.action.receive'), value: DocumentTransactionAction.Receive },
      { label: this.translate.instant('custody.action.deliver'), value: DocumentTransactionAction.Deliver },
      { label: this.translate.instant('custody.action.sign'), value: DocumentTransactionAction.Sign },
      { label: this.translate.instant('custody.action.return'), value: DocumentTransactionAction.Return },
    ];
  }

  employeeOptions() {
    return this.employees().map((e) => ({ label: `${e.employeeNumber} — ${e.fullName}`, value: e.id }));
  }

  employeeName(id: string | null | undefined): string {
    if (!id) return '—';
    const e = this.employees().find((x) => x.id === id);
    return e ? e.fullName : id;
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      history: this.custodyApi.getDocumentHistory(this.documentId).pipe(
        catchError((err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          return of([] as DocumentTransactionDto[]);
        })
      ),
      active: this.custodyApi.getActiveDocuments().pipe(
        catchError(() => of([]))
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ history, active }) => {
        this.history.set(history);
        this.isActive.set(active.some((d) => d.id === this.documentId));
      });
  }

  actionLabel(a: DocumentTransactionAction): string {
    const keys: Record<DocumentTransactionAction, string> = {
      [DocumentTransactionAction.Receive]: 'custody.action.receive',
      [DocumentTransactionAction.Deliver]: 'custody.action.deliver',
      [DocumentTransactionAction.Sign]: 'custody.action.sign',
      [DocumentTransactionAction.Return]: 'custody.action.return',
    };
    return keys[a] ?? String(a);
  }

  openTransfer(): void {
    this.transferAction = DocumentTransactionAction.Deliver;
    this.transferFromId = null;
    this.transferToId = null;
    this.transferDate = new Date();
    this.transferNotes = '';
    this.transferVisible = true;
  }

  openComplete(): void {
    this.completeDate = new Date();
    this.completeById = null;
    this.completeNotes = '';
    this.completeVisible = true;
  }

  submitTransfer(): void {
    this.loading.set(true);
    this.custodyApi
      .transferDocument({
        documentId: this.documentId,
        action: this.transferAction,
        fromEmployeeId: this.transferFromId,
        toEmployeeId: this.transferToId,
        transactionDate: this.transferDate.toISOString(),
        notes: this.transferNotes || null,
        attachmentUrl: null,
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          return of(false);
        })
      )
      .subscribe((ok) => {
        if (ok) {
          this.messageService.add({ severity: 'success', summary: 'OK', detail: '' });
          this.transferVisible = false;
          this.load();
        }
      });
  }

  submitComplete(): void {
    this.loading.set(true);
    this.custodyApi
      .completeDocument({
        documentId: this.documentId,
        completedAt: this.completeDate.toISOString(),
        completedByEmployeeId: this.completeById,
        notes: this.completeNotes || null,
        attachmentUrl: null,
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((err: Error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
          return of(false);
        })
      )
      .subscribe((ok) => {
        if (ok) {
          this.messageService.add({ severity: 'success', summary: 'OK', detail: '' });
          this.completeVisible = false;
          this.load();
        }
      });
  }
}
