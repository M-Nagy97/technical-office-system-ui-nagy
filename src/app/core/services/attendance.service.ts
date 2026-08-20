import { Injectable, inject, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, map } from 'rxjs';
import { EmployeeService } from './employee.service';
import { AttendanceRecord, AttendanceSummary, AttendanceStatus } from '../models/attendance.model';
import { generateMockAttendanceRecords } from '../mocks/attendance.mock';

const REQUIRED_HOURS = 8;
const WORK_START = '08:00';
const WORK_END = '16:00';

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly employeeService = inject(EmployeeService);
  private readonly recordsState = signal<AttendanceRecord[]>([]);

  readonly records = this.recordsState.asReadonly();
  readonly records$ = toObservable(this.recordsState);

  constructor() {
    this.initMockData();
  }

  private generateId(): string {
    return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private initMockData(): void {
    const employees = this.employeeService.getList();
    if (employees.length > 0) {
      const records = generateMockAttendanceRecords(employees);
      this.recordsState.set(records);
    }
  }

  get allRecords(): AttendanceRecord[] {
    return this.recordsState();
  }

  getRecordsByDate(date: Date): Observable<AttendanceRecord[]> {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return this.records$.pipe(
      map((list) => list.filter((r) => new Date(r.date).setHours(0, 0, 0, 0) === d))
    );
  }

  getRecordsByDateSync(date: Date): AttendanceRecord[] {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return this.recordsState().filter((r) => new Date(r.date).setHours(0, 0, 0, 0) === d);
  }

  ensureRecordsForDate(date: Date): AttendanceRecord[] {
    const existing = this.getRecordsByDateSync(date);
    const employees = this.employeeService.getList();
    if (existing.length >= employees.length) return existing;

    const existingIds = new Set(existing.map((r) => r.employeeId));
    const newRecords: AttendanceRecord[] = [];

    for (const emp of employees) {
      if (existingIds.has(emp.id)) continue;
      const record: AttendanceRecord = {
        id: this.generateId(),
        employeeId: emp.id,
        employeeName: emp.fullName,
        date: new Date(date),
        checkIn: '--:--',
        checkOut: '--:--',
        workHours: 0,
        requiredHours: REQUIRED_HOURS,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        status: 'absent',
      };
      newRecords.push(record);
      existingIds.add(emp.id);
    }

    if (newRecords.length > 0) {
      this.recordsState.update((current) => [...current, ...newRecords]);
    }

    return [...existing, ...newRecords];
  }

  updateRecord(id: string, patch: Partial<AttendanceRecord>): AttendanceRecord | null {
    const list = this.recordsState();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated: AttendanceRecord = { ...list[index], ...patch };
    this.recordsState.update((current) => {
      const copy = [...current];
      copy[index] = updated;
      return copy;
    });

    return updated;
  }

  getSummaries(month: number, year: number, employeeId?: string): AttendanceSummary[] {
    const list = this.recordsState();
    const byEmployee = new Map<string, AttendanceRecord[]>();
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 0).getTime();

    for (const r of list) {
      const t = new Date(r.date).getTime();
      if (t < start || t > end) continue;
      if (employeeId && r.employeeId !== employeeId) continue;
      if (!byEmployee.has(r.employeeId)) byEmployee.set(r.employeeId, []);
      byEmployee.get(r.employeeId)!.push(r);
    }

    const summaries: AttendanceSummary[] = [];
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (const [eid, recs] of byEmployee) {
      const presentDays = recs.filter((r) => r.status === 'present').length;
      const absentDays = recs.filter((r) => r.status === 'absent').length;
      const lateDays = recs.filter((r) => r.status === 'late').length;
      const vacationDays = recs.filter((r) => r.status === 'vacation').length;
      const totalLateMinutes = recs.reduce((s, r) => s + r.lateMinutes, 0);

      summaries.push({
        employeeId: eid,
        employeeName: recs[0]?.employeeName ?? '',
        month,
        year,
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        vacationDays,
        totalLateMinutes,
      });
    }

    return summaries;
  }

  getRecordsForEmployeeMonth(employeeId: string, month: number, year: number): AttendanceRecord[] {
    const list = this.recordsState();
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 0).getTime();

    return list.filter((r) => {
      if (r.employeeId !== employeeId) return false;
      const t = new Date(r.date).getTime();
      return t >= start && t <= end;
    });
  }

  markAllPresentForDate(date: Date): void {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    this.recordsState.update((list) =>
      list.map((r) => {
        if (new Date(r.date).setHours(0, 0, 0, 0) !== d) return r;
        return {
          ...r,
          status: 'present' as const,
          checkIn: WORK_START,
          checkOut: WORK_END,
          workHours: REQUIRED_HOURS,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
        };
      })
    );
  }
}

