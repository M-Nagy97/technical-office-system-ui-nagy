import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmployeeDocument } from '../models/employee.model';
import {
  isPersistedDocumentId,
  mapDocumentType,
  truncateDocumentNumber,
} from '../mappers/employee-document-types';
import { resolveMediaUrl, toStorageFileUrl } from '../utils/media-url.util';

export interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** Matches backend EmployeeDocumentDto (with EmployeeId). */
export interface DocumentEmployeeDto {
  id?: string;
  employeeId?: string;
  documentTypeId?: string;
  documentNumber?: string | null;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string | null;
}

export interface CreateDocumentEmployeePayload {
  employeeId: string;
  documentTypeId: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
}

export interface UpdateDocumentEmployeePayload extends CreateDocumentEmployeePayload {
  id: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentEmployeeService {
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    return `${environment.apiBaseUrl.replace(/\/$/, '')}/api/DocumentEmployee`;
  }

  private mapResult<T>(res: ApiResult<T>, fallbackMessage: string): T {
    if (!res?.success) {
      throw new Error(res?.message || fallbackMessage);
    }
    return res.data;
  }

  list(employeeId?: string | null): Observable<DocumentEmployeeDto[]> {
    let params = new HttpParams();
    if (employeeId) {
      params = params.set('employeeId', employeeId);
    }
    return this.http
      .get<ApiResult<DocumentEmployeeDto[]>>(this.baseUrl, { params })
      .pipe(map((r) => this.mapResult(r, 'فشل تحميل المستندات')));
  }

  getById(id: string): Observable<DocumentEmployeeDto> {
    return this.http
      .get<ApiResult<DocumentEmployeeDto>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => this.mapResult(r, 'فشل تحميل المستند')));
  }

  create(payload: CreateDocumentEmployeePayload): Observable<string> {
    return this.http
      .post<ApiResult<string>>(this.baseUrl, payload)
      .pipe(map((r) => this.mapResult(r, 'فشل إنشاء المستند')));
  }

  update(id: string, payload: UpdateDocumentEmployeePayload): Observable<boolean> {
    return this.http
      .put<ApiResult<boolean>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((r) => this.mapResult(r, 'فشل تحديث المستند')));
  }

  delete(id: string, employeeId: string): Observable<boolean> {
    const params = new HttpParams().set('employeeId', employeeId);
    return this.http
      .delete<ApiResult<boolean>>(`${this.baseUrl}/${id}`, { params })
      .pipe(map((r) => this.mapResult(r, 'فشل حذف المستند')));
  }

  toDomain(dto: DocumentEmployeeDto, index = 0): EmployeeDocument {
    return {
      id: isPersistedDocumentId(dto.id) ? dto.id!.trim() : `doc-${index}`,
      documentNumber: dto.documentNumber ?? '',
      documentTypeId: dto.documentTypeId,
      type: mapDocumentType(dto.documentTypeId),
      name: dto.documentNumber ?? '',
      fileUrl: resolveMediaUrl(dto.fileUrl),
      uploadDate: dto.issueDate ? new Date(dto.issueDate) : new Date(0),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
    };
  }

  toDomainList(dtos: DocumentEmployeeDto[] | null | undefined): EmployeeDocument[] {
    if (!dtos?.length) return [];
    return dtos.map((dto, index) => this.toDomain(dto, index));
  }

  buildCreatePayload(
    employeeId: string,
    doc: Pick<
      EmployeeDocument,
      'documentTypeId' | 'documentNumber' | 'name' | 'fileUrl' | 'uploadDate' | 'expiryDate'
    >
  ): CreateDocumentEmployeePayload {
    const now = new Date();
    const issue = doc.uploadDate instanceof Date ? doc.uploadDate : new Date(doc.uploadDate || now);
    const expiry =
      doc.expiryDate instanceof Date
        ? doc.expiryDate
        : doc.expiryDate
          ? new Date(doc.expiryDate)
          : new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

    return {
      employeeId,
      documentTypeId: doc.documentTypeId!,
      documentNumber: truncateDocumentNumber(doc.documentNumber || doc.name, 'DOC'),
      issueDate: issue.toISOString(),
      expiryDate: expiry.toISOString(),
      fileUrl: toStorageFileUrl(doc.fileUrl) || '',
    };
  }
}
