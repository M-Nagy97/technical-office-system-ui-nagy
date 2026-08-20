import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Configuration } from '../api/generated/configuration';

/** Matches backend WorkforceAttendanceSettingsDto (camelCase JSON). */
export interface WorkforceAttendanceSettingsDto {
  id: string;
  defaultCalculationMethod: string;
  lateToleranceMinutes: number;
  earlyLeaveToleranceMinutes: number;
  roundToNearestMinutes: number;
  requirePunchOut: boolean;
}

export interface UpsertWorkforceAttendanceSettingsPayload {
  defaultCalculationMethod: string;
  lateToleranceMinutes: number;
  earlyLeaveToleranceMinutes: number;
  roundToNearestMinutes: number;
  requirePunchOut: boolean;
}

import { environment } from '../../../environments/environment';

interface ApiResult<T> {
  success?: boolean;
  message?: string | null;
  data?: T | null;
}

@Injectable({
  providedIn: 'root',
})
export class WorkforceAttendanceSettingsService {
  private readonly http = inject(HttpClient);
  private readonly configuration =
    inject(Configuration, { optional: true }) ?? new Configuration();

  private get baseUrl(): string {
    const b = this.configuration.basePath ?? environment.apiBaseUrl;
    return b.replace(/\/$/, '');
  }

  private unwrap<T>(res: ApiResult<T>, fallback: string): T {
    if (res?.success === false) {
      throw new Error(res?.message || fallback);
    }
    if (res?.data === undefined || res?.data === null) {
      throw new Error(fallback);
    }
    return res.data;
  }

  get(): Observable<WorkforceAttendanceSettingsDto | null> {
    return this.http
      .get<ApiResult<WorkforceAttendanceSettingsDto | null>>(`${this.baseUrl}/api/WorkforceAttendanceSettings`)
      .pipe(
        map((r) => {
          if (r?.success === false) throw new Error(r?.message || 'settings.load_failed');
          return r?.data ?? null;
        })
      );
  }

  upsert(body: UpsertWorkforceAttendanceSettingsPayload): Observable<WorkforceAttendanceSettingsDto> {
    return this.http
      .put<ApiResult<WorkforceAttendanceSettingsDto>>(`${this.baseUrl}/api/WorkforceAttendanceSettings`, body)
      .pipe(map((r) => this.unwrap(r, 'settings.save_failed')));
  }
}