import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaveTypeDto {
  id: string;
  name: string;
  arabicName: string;
  maxDaysPerYear: number | null;
  requiresDocument: boolean;
  isPaid: boolean;
  isActive: boolean;
}

export interface CreateLeaveTypeCommand {
  name: string;
  arabicName: string;
  maxDaysPerYear: number | null;
  requiresDocument: boolean;
  isPaid: boolean;
  isActive: boolean;
}

export type CreateLeaveTypePayload = CreateLeaveTypeCommand;

interface ApiResult<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LeaveTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/leave-types`;

  /** GET /api/leave-types */
  getAll(includeInactive?: boolean): Observable<LeaveTypeDto[]> {
    const options = includeInactive !== undefined ? { params: { includeInactive: String(includeInactive) } } : {};
    return this.http.get<ApiResult<LeaveTypeDto[]> | LeaveTypeDto[]>(this.baseUrl, options).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        return res?.data ?? [];
      })
    );
  }

  /** GET /api/leave-types/{id} */
  getById(id: string): Observable<LeaveTypeDto> {
    return this.http.get<ApiResult<LeaveTypeDto> | LeaveTypeDto>(`${this.baseUrl}/${id}`).pipe(
      map((res) => ('data' in res && res.data ? res.data : (res as LeaveTypeDto)))
    );
  }

  /** POST /api/leave-types */
  create(payload: CreateLeaveTypeCommand): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  /** PUT /api/leave-types/{id} */
  update(id: string, payload: CreateLeaveTypeCommand): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }

  /** DELETE /api/leave-types/{id} */
  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
