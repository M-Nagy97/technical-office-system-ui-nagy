import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { EmployeeService } from './employee.service';
import { AttendanceRecord, AttendanceSummary } from '../models/attendance.model';

const REQUIRED_HOURS = 8;
const WORK_START = '08:00';
const WORK_END = '16:00';

type Status = AttendanceRecord['status'];

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly employeeService = inject(EmployeeService);
  private readonly recordsSubject = new BehaviorSubject<AttendanceRecord[]>([]);
  readonly records$ = this.recordsSubject.asObservable();

  constructor() {
    this.seedCurrentMonth();
  }

  private generateId(): string {
    return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private seedCurrentMonth(): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const employees = this.employeeService.getList();
    const records: AttendanceRecord[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (const emp of employees) {
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        if (date.getDay() === 5 || date.getDay() === 6) continue; // skip Fri, Sat
        const status = this.randomStatus();
        const { checkIn, checkOut, workHours, lateMinutes, earlyLeaveMinutes } =
          this.timesForStatus(status);
        records.push({
          id: this.generateId(),
          employeeId: emp.id,
          employeeName: emp.fullName,
          date: new Date(date),
          checkIn,
          checkOut,
          workHours,
          requiredHours: REQUIRED_HOURS,
          lateMinutes,
          earlyLeaveMinutes,
          status,
        });
      }
    }
    this.recordsSubject.next(records);
  }

  private randomStatus(): Status {
    const r = Math.random();
    if (r < 0.02) return 'absent';
    if (r < 0.08) return 'late';
    if (r < 0.09) return 'vacation';
    if (r < 0.10) return 'sick_leave';
    if (r < 0.11) return 'excused';
    return 'present';
  }

  private timesForStatus(
    status: Status
  ): {
    checkIn: string;
    checkOut: string;
    workHours: number;
    lateMinutes: number;
    earlyLeaveMinutes: number;
  } {
    if (status === 'absent' || status === 'vacation' || status === 'sick_leave' || status === 'excused') {
      return {
        checkIn: '--:--',
        checkOut: '--:--',
        workHours: 0,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
      };
    }
    if (status === 'late') {
      const lateM = Math.floor(Math.random() * 60) + 5;
      const checkIn = this.addMinutesToTime(WORK_START, lateM);
      return {
        checkIn,
        checkOut: WORK_END,
        workHours: REQUIRED_HOURS - lateM / 60,
        lateMinutes: lateM,
        earlyLeaveMinutes: 0,
      };
    }
    return {
      checkIn: WORK_START,
      checkOut: WORK_END,
      workHours: REQUIRED_HOURS,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
    };
  }

  private addMinutesToTime(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  getRecordsByDate(date: Date): Observable<AttendanceRecord[]> {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return this.records$.pipe(
      map((list) =>
        list.filter((r) => new Date(r.date).setHours(0, 0, 0, 0) === d)
      )
    );
  }

  getRecordsByDateSync(date: Date): AttendanceRecord[] {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return this.recordsSubject.getValue().filter((r) => new Date(r.date).setHours(0, 0, 0, 0) === d);
  }

  ensureRecordsForDate(date: Date): AttendanceRecord[] {
    const existing = this.getRecordsByDateSync(date);
    const employees = this.employeeService.getList();
    if (existing.length >= employees.length) return existing;
    const existingIds = new Set(existing.map((r) => r.employeeId));
    const records = [...this.recordsSubject.getValue()];
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
      records.push(record);
      existing.push(record);
      existingIds.add(emp.id);
    }
    this.recordsSubject.next(records);
    return existing;
  }

  updateRecord(id: string, patch: Partial<AttendanceRecord>): AttendanceRecord | null {
    const list = this.recordsSubject.getValue();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...patch };
    const next = [...list];
    next[index] = updated;
    this.recordsSubject.next(next);
    return updated;
  }

  getSummaries(month: number, year: number, employeeId?: string): AttendanceSummary[] {
    const list = this.recordsSubject.getValue();
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
    const list = this.recordsSubject.getValue();
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 0).getTime();
    return list.filter((r) => {
      if (r.employeeId !== employeeId) return false;
      const t = new Date(r.date).getTime();
      return t >= start && t <= end;
    });
  }

  markAllPresentForDate(date: Date): void {
    const list = this.recordsSubject.getValue();
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const next = list.map((r) => {
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
    });
    this.recordsSubject.next(next);
  }

  get allRecords(): AttendanceRecord[] {
    return this.recordsSubject.getValue();
  }
}
