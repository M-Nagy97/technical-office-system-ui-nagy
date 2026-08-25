import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResult, EmployeeEnrollLink, LinkEnrollRequest } from '../models/employee-enroll-link.model';

@Injectable({ providedIn: 'root' })
export class EmployeeEnrollService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/attendance/employee-enroll`;

  getAll(): Observable<EmployeeEnrollLink[]> {
    return this.http
      .get<ApiResult<EmployeeEnrollLink[]>>(this.base)
      .pipe(map((r) => r.data ?? []));
  }

  link(employeeId: string, enrollNumber: string): Observable<boolean> {
    const body: LinkEnrollRequest = { enrollNumber };
    return this.http
      .put<ApiResult<boolean>>(`${this.base}/${employeeId}`, body)
      .pipe(map((r) => r.data ?? false));
  }
}
