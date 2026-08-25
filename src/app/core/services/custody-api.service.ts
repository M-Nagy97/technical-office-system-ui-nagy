import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiResult,
  CompleteDocumentPayload,
  CreateCustodyTransactionPayload,
  CreateDocumentPayload,
  CustodyDocumentSummaryDto,
  DocumentTransactionDto,
  EmployeeCustodyDetailsDto,
  ReturnCustodyAmountPayload,
  TransferDocumentPayload,
} from '../models/custody.models';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CustodyApiService {
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    return environment.apiBaseUrl.replace(/\/$/, '');
  }

  private mapResult<T>(res: ApiResult<T>, fallbackMessage: string): T {
    if (!res?.success) {
      throw new Error(res?.message || fallbackMessage);
    }
    return res.data;
  }

  createTransaction(payload: CreateCustodyTransactionPayload): Observable<string> {
    return this.http
      .post<ApiResult<string>>(`${this.baseUrl}/api/custody/transactions`, payload)
      .pipe(map((r) => this.mapResult(r, 'custody.transaction_failed')));
  }

  returnAmount(payload: ReturnCustodyAmountPayload): Observable<string> {
    return this.http
      .post<ApiResult<string>>(`${this.baseUrl}/api/custody/returns`, payload)
      .pipe(map((r) => this.mapResult(r, 'custody.return_failed')));
  }

  getBalance(employeeId: string): Observable<number> {
    return this.http
      .get<ApiResult<number>>(`${this.baseUrl}/api/custody/${employeeId}/balance`)
      .pipe(map((r) => this.mapResult(r, 'custody.balance_failed')));
  }

  getEmployeeDetails(employeeId: string): Observable<EmployeeCustodyDetailsDto> {
    return this.http
      .get<ApiResult<EmployeeCustodyDetailsDto>>(`${this.baseUrl}/api/custody/${employeeId}/details`)
      .pipe(map((r) => this.mapResult(r, 'custody.details_failed')));
  }

  createDocument(payload: CreateDocumentPayload): Observable<string> {
    return this.http
      .post<ApiResult<string>>(`${this.baseUrl}/api/documents`, payload)
      .pipe(map((r) => this.mapResult(r, 'custody.document_create_failed')));
  }

  transferDocument(payload: TransferDocumentPayload): Observable<boolean> {
    return this.http
      .post<ApiResult<boolean>>(`${this.baseUrl}/api/documents/transfer`, payload)
      .pipe(map((r) => this.mapResult(r, 'custody.transfer_failed')));
  }

  completeDocument(payload: CompleteDocumentPayload): Observable<boolean> {
    return this.http
      .post<ApiResult<boolean>>(`${this.baseUrl}/api/documents/complete`, payload)
      .pipe(map((r) => this.mapResult(r, 'custody.complete_failed')));
  }

  getDocumentHistory(documentId: string): Observable<DocumentTransactionDto[]> {
    return this.http
      .get<ApiResult<DocumentTransactionDto[]>>(`${this.baseUrl}/api/documents/${documentId}/history`)
      .pipe(map((r) => this.mapResult(r, 'custody.history_failed')));
  }

  getActiveDocuments(): Observable<CustodyDocumentSummaryDto[]> {
    return this.http
      .get<ApiResult<CustodyDocumentSummaryDto[]>>(`${this.baseUrl}/api/documents/active`)
      .pipe(map((r) => this.mapResult(r, 'custody.active_failed')));
  }
}
