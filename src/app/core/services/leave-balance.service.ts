import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EmployeeLeaveBalanceDto,
  InitialiseLeaveBalanceCommand,
} from '../models/leave-balance.model';

interface ApiResult<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LeaveBalanceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl.replace(/\/$/, '')}/api/leave-balances`;

  /** GET /api/leave-balances */
  getByEmployee(employeeId: string, year?: number): Observable<EmployeeLeaveBalanceDto[]> {
    let params = new HttpParams().set('employeeId', employeeId);
    if (year !== undefined && year !== null) {
      params = params.set('year', String(year));
    }

    return this.http.get<ApiResult<EmployeeLeaveBalanceDto[]> | EmployeeLeaveBalanceDto[]>(this.baseUrl, { params }).pipe(
      map((res) => {
        if (Array.isArray(res)) return res;
        return res?.data ?? [];
      })
    );
  }

  /** POST /api/leave-balances/initialise */
  initialise(
    employeeId: string,
    leaveTypeId: string,
    year: number,
    allowedDays: number
  ): Observable<boolean> {
    const payload: InitialiseLeaveBalanceCommand = {
      employeeId,
      leaveTypeId,
      year,
      allowedDays,
    };

    return this.http
      .post<ApiResult<boolean> | boolean>(`${this.baseUrl}/initialise`, payload)
      .pipe(map((res) => (typeof res === 'boolean' ? res : (res?.data ?? true))));
  }

  /** DELETE /api/leave-balances/{id} */
  deleteBalance(id: string): Observable<boolean> {
    return this.http
      .delete<ApiResult<boolean> | boolean>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => (typeof res === 'boolean' ? res : (res?.data ?? true))));
  }
}

