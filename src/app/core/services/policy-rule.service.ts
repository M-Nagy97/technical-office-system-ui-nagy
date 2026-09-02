import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PolicyRuleDto,
  RuleCatalogItemDto,
  CreatePolicyRuleCommand,
  UpdatePolicyRuleCommand,
  RuleTargetScope,
} from '../models/policy-rule.model';

interface ApiResult<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PolicyRuleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/policy-rules`;

  /** GET /api/policy-rules */
  getRules(scope?: RuleTargetScope, leaveTypeId?: string): Observable<PolicyRuleDto[]> {
    let params = new HttpParams();
    if (scope !== undefined && scope !== null) {
      params = params.set('scope', String(scope));
    }
    if (leaveTypeId) {
      params = params.set('leaveTypeId', leaveTypeId);
    }

    return this.http.get<ApiResult<PolicyRuleDto[]> | PolicyRuleDto[]>(this.baseUrl, { params }).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        return res?.data ?? [];
      })
    );
  }

  /** GET /api/policy-rules/catalog */
  getCatalog(scope?: RuleTargetScope): Observable<RuleCatalogItemDto[]> {
    let params = new HttpParams();
    if (scope !== undefined && scope !== null) {
      params = params.set('scope', String(scope));
    }

    return this.http
      .get<ApiResult<RuleCatalogItemDto[]> | RuleCatalogItemDto[]>(`${this.baseUrl}/catalog`, { params })
      .pipe(
        map((res) => {
          if (Array.isArray(res)) return res;
          return res?.data ?? [];
        })
      );
  }

  /** POST /api/policy-rules */
  createRule(command: CreatePolicyRuleCommand): Observable<string> {
    return this.http.post<ApiResult<string> | string>(this.baseUrl, command).pipe(
      map((res) => {
        if (typeof res === 'string') return res;
        if (res && 'data' in res && res.data) return String(res.data);
        return '';
      })
    );
  }

  /** PUT /api/policy-rules/{id} */
  updateRule(id: string, command: UpdatePolicyRuleCommand): Observable<boolean> {
    return this.http
      .put<ApiResult<boolean> | boolean>(`${this.baseUrl}/${id}`, command)
      .pipe(map((res) => (typeof res === 'boolean' ? res : (res?.data ?? true))));
  }

  /** PATCH /api/policy-rules/{id}/toggle */
  toggleRule(id: string, isEnabled: boolean): Observable<boolean> {
    return this.http
      .patch<ApiResult<boolean> | boolean>(`${this.baseUrl}/${id}/toggle`, { isEnabled })
      .pipe(map((res) => (typeof res === 'boolean' ? res : (res?.data ?? true))));
  }

  /** DELETE /api/policy-rules/{id} */
  deleteRule(id: string): Observable<boolean> {
    return this.http
      .delete<ApiResult<boolean> | boolean>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => (typeof res === 'boolean' ? res : (res?.data ?? true))));
  }
}
