import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AttendanceService as GeneratedAttendanceService } from '../api/generated/api/attendance.service';
import { AttendanceCalculationResultDto } from '../api/generated/model/attendanceCalculationResultDto';
import { RunAttendanceCalculationCommand } from '../api/generated/model/runAttendanceCalculationCommand';

export interface RecordManualPunchRequest {
  employeeId: string;
  punchTime: string; // ISO 8601
  punchType: 0 | 1;  // 0 = In, 1 = Out
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceApiService {
  private readonly generated = inject(GeneratedAttendanceService);
  private readonly http = inject(HttpClient);

  getCalculationResultsForDate(date: Date): Observable<AttendanceCalculationResultDto[]> {
    const dateStr = this.toDateOnlyString(date);
    return this.generated.attendanceGetCalculationResultsForDate(dateStr).pipe(
      map((res) => res.data ?? [])
    );
  }

  runCalculation(date: Date, methodOverride?: RunAttendanceCalculationCommand['methodOverride']): Observable<boolean> {
    const dateStr = this.toDateOnlyString(date);
    return this.generated.attendanceRunCalculation({ date: dateStr, methodOverride }).pipe(
      map((res) => res.data ?? false)
    );
  }

  recordManualPunch(request: RecordManualPunchRequest): Observable<string> {
    const basePath = typeof this.generated.configuration.basePath === 'string'
      ? this.generated.configuration.basePath
      : '';
    const url = `${basePath}/api/Attendance/manual-punch`;
    return this.http.post<{ data?: string }>(url, {
      employeeId: request.employeeId,
      punchTime: request.punchTime,
      punchType: request.punchType,
      notes: request.notes ?? null,
    }).pipe(
      map((res) => res.data ?? '')
    );
  }

  private toDateOnlyString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
