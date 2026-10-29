import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AttendanceService as GeneratedAttendanceService } from '../api/generated/api/attendance.service';
import { AttendanceCalculationResultDto } from '../api/generated/model/attendanceCalculationResultDto';
import { AttendanceCalcDto } from '../api/generated/model/attendanceCalcDto';
import { RunAttendanceCalculationCommand } from '../api/generated/model/runAttendanceCalculationCommand';
import { RecordManualPunchRequest } from '../models/attendance.model';
import { environment } from '../../../environments/environment';

export enum AttendancePermissionKind {
  TimeRange = 0,
  HalfDay = 1,
}

export interface AttendancePermissionOverlay {
  permissionRequestId?: string;
  permissionTypeName?: string | null;
  permissionTypeArabicName?: string | null;
  kind?: AttendancePermissionKind;
  fromTime?: string | null;
  toTime?: string | null;
  isMorning?: boolean | null;
}

export interface AttendanceLeaveOverlayDay {
  employeeId?: string;
  workDate?: string;
  leaveRequestId?: string | null;
  leaveTypeName?: string | null;
  leaveTypeArabicName?: string | null;
  leaveStartDate?: string | null;
  leaveEndDate?: string | null;
  isCompensatoryLeave?: boolean;
  permissions?: AttendancePermissionOverlay[] | null;
}

export enum PublicHolidayStatus {
  Confirmed = 1,
  Draft = 2,
}

export enum PublicHolidayImportRowStatus {
  New = 1,
  Duplicate = 2,
  Conflict = 3,
  Invalid = 4,
}

export interface PublicHolidayDto {
  id: string;
  name: string;
  fromDate: string;
  toDate: string;
  notes?: string | null;
  originalOccasionDate?: string | null;
  status?: PublicHolidayStatus;
  isMovable?: boolean;
}

export interface PublicHolidayWriteRequest {
  name: string;
  fromDate: string;
  toDate: string;
  notes?: string | null;
  originalOccasionDate?: string | null;
}

export interface PublicHolidayImportInput {
  name?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  notes?: string | null;
  originalOccasionDate?: string | null;
  sourceRow: number;
}

export interface PublicHolidayImportPreviewRow {
  sourceRow: number;
  name?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  notes?: string | null;
  originalOccasionDate?: string | null;
  status: PublicHolidayImportRowStatus;
  message?: string | null;
  messageAr?: string | null;
  existingHolidayId?: string | null;
  affectedCalcCount: number;
}

export interface PublicHolidayImportPreviewDto {
  rows: PublicHolidayImportPreviewRow[];
  newCount: number;
  duplicateCount: number;
  conflictCount: number;
  invalidCount: number;
  affectedCalcCount: number;
}

export interface PublicHolidayImportCommitRow {
  name: string;
  fromDate: string;
  toDate: string;
  notes?: string | null;
  originalOccasionDate?: string | null;
  existingHolidayId?: string | null;
}

export interface CopyPreviousYearPublicHolidaysResult {
  created: number;
  skipped: number;
  movable: number;
}

export interface EmployeeScheduleOverrideRequest {
  dayType: number;
  isHoliday: boolean;
  shiftId?: string | null;
  notes?: string | null;
}

export interface RegisterManualAttendanceRequest {
  employeeId: string;
  workDate: string;
  actualIn?: string | null;
  actualOut?: string | null;
  notes?: string | null;
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
    const url = `${environment.apiBaseUrl}/api/Attendance/manual-punch`;

    return this.http.post<{ data?: string }>(url, {
      employeeId: request.employeeId,
      punchTime: request.punchTime,
      punchType: request.punchType,
      notes: request.notes ?? null,
    }).pipe(
      map((res) => res.data ?? '')
    );
  }

  registerManualAttendance(request: RegisterManualAttendanceRequest): Observable<AttendanceCalcDto> {
    const url = `${environment.apiBaseUrl}/api/AttendanceCalc/manual-register`;
    return this.http
      .post<{ success?: boolean; data?: AttendanceCalcDto | null; message?: string | null }>(url, request)
      .pipe(
        map((res) => {
          if (!res.success || !res.data) {
            throw new Error(res.message || 'manual-register failed');
          }
          return res.data;
        })
      );
  }

  getPublicHolidays(filter: { year?: number; from?: string; to?: string }): Observable<PublicHolidayDto[]> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays`;
    let params = new HttpParams();
    if (filter.year != null) params = params.set('year', String(filter.year));
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    return this.http
      .get<{ success?: boolean; data?: PublicHolidayDto[] | null }>(url, { params })
      .pipe(map((res) => res.data ?? []));
  }

  createPublicHoliday(body: PublicHolidayWriteRequest): Observable<string> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays`;
    return this.http.post<{ success?: boolean; data?: string | null }>(url, body).pipe(
      map((res) => {
        if (!res.success || !res.data) throw new Error('create holiday failed');
        return res.data;
      })
    );
  }

  updatePublicHoliday(id: string, body: PublicHolidayWriteRequest): Observable<boolean> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays/${id}`;
    return this.http.put<{ success?: boolean; data?: boolean | null }>(url, { id, ...body }).pipe(
      map((res) => !!res.success && res.data !== false)
    );
  }

  deletePublicHoliday(id: string): Observable<boolean> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays/${id}`;
    return this.http.delete<{ success?: boolean; data?: boolean | null }>(url).pipe(
      map((res) => !!res.success)
    );
  }

  previewPublicHolidaysImport(
    year: number,
    rows: PublicHolidayImportInput[]
  ): Observable<PublicHolidayImportPreviewDto> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays/preview-import`;
    return this.http
      .post<{ success?: boolean; data?: PublicHolidayImportPreviewDto | null }>(url, { year, rows })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) throw new Error('preview import failed');
          return res.data;
        })
      );
  }

  commitPublicHolidaysImport(
    year: number,
    rows: PublicHolidayImportCommitRow[],
    recalculateExistingAttendance: boolean
  ): Observable<number> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays/commit-import`;
    return this.http
      .post<{ success?: boolean; data?: number | null }>(url, {
        year,
        rows,
        recalculateExistingAttendance,
      })
      .pipe(map((res) => (res.success ? res.data ?? 0 : 0)));
  }

  copyPreviousYearPublicHolidays(targetYear: number): Observable<CopyPreviousYearPublicHolidaysResult> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays/copy-previous-year`;
    return this.http
      .post<{ success?: boolean; data?: CopyPreviousYearPublicHolidaysResult | null }>(url, { targetYear })
      .pipe(
        map((res) => {
          if (!res.success || !res.data) throw new Error('copy previous year failed');
          return res.data;
        })
      );
  }

  confirmPublicHoliday(
    id: string,
    year: number,
    recalculateExistingAttendance: boolean
  ): Observable<boolean> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays/${id}/confirm`;
    return this.http
      .post<{ success?: boolean; data?: boolean | null }>(url, { id, year, recalculateExistingAttendance })
      .pipe(map((res) => !!res.success && res.data !== false));
  }

  confirmFixedPublicHolidayDrafts(year: number, recalculateExistingAttendance: boolean): Observable<number> {
    const url = `${environment.apiBaseUrl}/api/PublicHolidays/confirm-fixed-drafts`;
    return this.http
      .post<{ success?: boolean; data?: number | null }>(url, { year, recalculateExistingAttendance })
      .pipe(map((res) => (res.success ? res.data ?? 0 : 0)));
  }

  upsertEmployeeSchedule(employeeId: string, date: string, body: EmployeeScheduleOverrideRequest): Observable<string> {
    const url = `${environment.apiBaseUrl}/api/EmployeeSchedules/${employeeId}/${date}`;
    return this.http.put<{ success?: boolean; data?: string | null }>(url, body).pipe(
      map((res) => {
        if (!res.success || !res.data) throw new Error('upsert schedule failed');
        return res.data;
      })
    );
  }

  deleteEmployeeScheduleOverride(employeeId: string, date: string): Observable<boolean> {
    const url = `${environment.apiBaseUrl}/api/EmployeeSchedules/${employeeId}/${date}`;
    return this.http.delete<{ success?: boolean; data?: boolean | null }>(url).pipe(
      map((res) => !!res.success)
    );
  }

  getLeaveOverlay(from: string, to: string, empId?: string): Observable<AttendanceLeaveOverlayDay[]> {
    const url = `${environment.apiBaseUrl}/api/AttendanceCalc/leave-overlay`;
    let params = new HttpParams().set('from', from).set('to', to);
    if (empId) params = params.set('empId', empId);
    return this.http
      .get<{ success?: boolean; data?: AttendanceLeaveOverlayDay[] | null }>(url, { params })
      .pipe(map((res) => res.data ?? []));
  }

  private toDateOnlyString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

