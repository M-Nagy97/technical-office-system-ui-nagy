import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PermissionRequestDto,
  SubmitPermissionRequestCommand,
  SubmitPermissionRequestResponse,
  PermissionRequestFilter,
} from '../models/permission-request.model';
import { PolicyEvaluationResultDto } from '../models/policy-evaluation.model';
import { SKIP_GLOBAL_ERROR_NOTIFICATION } from '../interceptors/error.interceptor';

interface ApiResult<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PermissionRequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/permission-requests`;

  private readonly skipToastContext = new HttpContext().set(SKIP_GLOBAL_ERROR_NOTIFICATION, true);

  /** GET /api/permission-requests */
  getAll(filter?: PermissionRequestFilter): Observable<PermissionRequestDto[]> {
    let params = new HttpParams();
    if (filter) {
      if (filter.employeeId) params = params.set('employeeId', filter.employeeId);
      if (filter.status !== undefined && filter.status !== null) {
        params = params.set('status', String(filter.status));
      }
      if (filter.fromDate) params = params.set('fromDate', filter.fromDate);
      if (filter.toDate) params = params.set('toDate', filter.toDate);
    }

    return this.http.get<ApiResult<PermissionRequestDto[]> | PermissionRequestDto[]>(this.baseUrl, { params }).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        return res?.data ?? [];
      })
    );
  }

  /** GET /api/permission-requests/{id} */
  getById(id: string): Observable<PermissionRequestDto> {
    return this.http.get<ApiResult<PermissionRequestDto> | PermissionRequestDto>(`${this.baseUrl}/${id}`).pipe(
      map((res) => ('data' in res && res.data ? res.data : (res as PermissionRequestDto)))
    );
  }

  /** POST /api/permission-requests/evaluate */
  evaluate(command: SubmitPermissionRequestCommand): Observable<PolicyEvaluationResultDto> {
    return this.http
      .post<ApiResult<PolicyEvaluationResultDto> | PolicyEvaluationResultDto>(
        `${this.baseUrl}/evaluate`,
        command,
        { context: this.skipToastContext }
      )
      .pipe(
        map((res) => {
          if (res && typeof res === 'object' && 'data' in res && res.data) {
            return this.normalizeEvaluation(res.data);
          }
          return this.normalizeEvaluation(res as PolicyEvaluationResultDto);
        })
      );
  }

  /** POST /api/permission-requests */
  submit(command: SubmitPermissionRequestCommand): Observable<SubmitPermissionRequestResponse> {
    return this.http.post<ApiResult<SubmitPermissionRequestResponse> | SubmitPermissionRequestResponse>(this.baseUrl, command).pipe(
      map((res) => {
        if (res && typeof res === 'object' && 'data' in res && res.data) {
          return res.data;
        }
        if (res && typeof res === 'object' && 'id' in res) {
          return res as SubmitPermissionRequestResponse;
        }
        return { id: String(res || '') };
      })
    );
  }

  /** PUT /api/permission-requests/{id}/approve */
  approve(id: string, approvedByUserId?: string): Observable<boolean> {
    return this.http
      .put<ApiResult<boolean> | boolean>(`${this.baseUrl}/${id}/approve`, {
        approvedByUserId: approvedByUserId || null,
      })
      .pipe(map((res) => (typeof res === 'boolean' ? res : (res?.data ?? true))));
  }

  /** PUT /api/permission-requests/{id}/reject */
  reject(id: string, reason: string): Observable<boolean> {
    return this.http
      .put<ApiResult<boolean> | boolean>(`${this.baseUrl}/${id}/reject`, { reason })
      .pipe(map((res) => (typeof res === 'boolean' ? res : (res?.data ?? true))));
  }

  /** PUT /api/permission-requests/{id}/cancel */
  cancel(id: string, cancellationReason?: string): Observable<boolean> {
    return this.http
      .put<ApiResult<boolean> | boolean>(`${this.baseUrl}/${id}/cancel`, {
        cancellationReason: cancellationReason || null,
        reason: cancellationReason || null,
      })
      .pipe(map((res) => (typeof res === 'boolean' ? res : (res?.data ?? true))));
  }

  private normalizeEvaluation(raw: PolicyEvaluationResultDto | null | undefined): PolicyEvaluationResultDto {
    return {
      hasErrors: !!raw?.hasErrors,
      hasWarnings: !!raw?.hasWarnings,
      errors: raw?.errors ?? [],
      warnings: raw?.warnings ?? [],
    };
  }
}
