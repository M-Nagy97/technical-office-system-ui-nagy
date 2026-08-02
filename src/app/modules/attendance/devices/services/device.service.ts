import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BASE_PATH } from '../../../../core/api/generated/variables';
import {
  ApiResult, ConnectionResult, Device, DeviceFormData, ReadLogsResult, SyncResult,
} from '../models/device.model';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH, { optional: true });
  private readonly base = `${this.basePath ?? 'https://localhost:8500'}/api/devices`;

  getAll(): Observable<Device[]> {
    return this.http.get<ApiResult<Device[]>>(this.base).pipe(map((r) => r.data ?? []));
  }

  getById(id: string): Observable<Device> {
    return this.http.get<ApiResult<Device>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  create(data: DeviceFormData): Observable<string> {
    return this.http.post<ApiResult<string>>(this.base, data).pipe(map((r) => r.data));
  }

  update(id: string, data: DeviceFormData): Observable<boolean> {
    return this.http.put<ApiResult<boolean>>(`${this.base}/${id}`, { id, ...data }).pipe(map((r) => r.data));
  }

  delete(id: string): Observable<boolean> {
    return this.http.delete<ApiResult<boolean>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  testConnection(id: string): Observable<ConnectionResult> {
    return this.http.post<ApiResult<ConnectionResult>>(`${this.base}/${id}/test`, {}).pipe(map((r) => r.data));
  }

  readLogs(id: string): Observable<ReadLogsResult> {
    return this.http.get<ApiResult<ReadLogsResult>>(`${this.base}/${id}/read-logs`).pipe(map((r) => r.data));
  }

  syncFromDevice(id: string): Observable<SyncResult> {
    return this.http.post<ApiResult<SyncResult>>(`${this.base}/${id}/sync`, {}).pipe(map((r) => r.data));
  }
}
