import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PermissionTypeDto {
  id: string;
  name: string;
  arabicName: string;
  isActive: boolean;
}

export interface CreatePermissionTypeCommand {
  name: string;
  arabicName: string;
  isActive: boolean;
}

interface ApiResult<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PermissionTypeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/permission-types`;

  getAll(includeInactive?: boolean): Observable<PermissionTypeDto[]> {
    const options = includeInactive !== undefined ? { params: { includeInactive: String(includeInactive) } } : {};
    return this.http.get<ApiResult<PermissionTypeDto[]> | PermissionTypeDto[]>(this.baseUrl, options).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        return res?.data ?? [];
      })
    );
  }

  getById(id: string): Observable<PermissionTypeDto> {
    return this.http.get<ApiResult<PermissionTypeDto> | PermissionTypeDto>(`${this.baseUrl}/${id}`).pipe(
      map((res) => ('data' in res && res.data ? res.data : (res as PermissionTypeDto)))
    );
  }

  create(payload: CreatePermissionTypeCommand): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  update(id: string, payload: CreatePermissionTypeCommand): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
