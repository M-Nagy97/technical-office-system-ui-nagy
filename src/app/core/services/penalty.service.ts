import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { EmployeeService } from './employee.service';
import { Penalty, PenaltyType, PenaltyStatus, PENALTY_TYPE_LABELS, PENALTY_STATUS_LABELS } from '../models/penalty.model';

export interface PenaltyFilter {
  employeeId?: string | null;
  type?: PenaltyType | null;
  status?: PenaltyStatus | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  searchText?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PenaltyService {
  private readonly employeeService = inject(EmployeeService);
  private readonly penaltiesSubject = new BehaviorSubject<Penalty[]>([]);
  readonly penalties$ = this.penaltiesSubject.asObservable();

  private static nextSeq = 1;

  constructor() {
    this.seedMock();
  }

  private generateId(): string {
    return `pen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private static nextPenaltyNumber(): string {
    const y = new Date().getFullYear();
    const n = String(PenaltyService.nextSeq++).padStart(4, '0');
    return `PEN-${y}-${n}`;
  }

  private seedMock(): void {
    const employees = this.employeeService.getList();
    if (employees.length === 0) return;
    const list: Penalty[] = [];
    const types: PenaltyType[] = ['warning', 'written_warning', 'deduction', 'suspension', 'dismissal'];
    const reasons: string[] = [
      'التأخر عن العمل دون عذر مقبول',
      'عدم الالتزام بمواعيد الدوام الرسمية',
      'إهمال في أداء المهام الموكلة',
      'مخالفة تعليمات العمل واللوائح الداخلية',
      'عدم تسليم التقرير الشهري في الموعد المحدد',
      'الغياب دون إذن مسبق لمدة يومين',
      'التصرف بشكل يخل بواجبات الوظيفة',
      'الإخلال بأمانة الوظيفة',
    ];
    const statuses: PenaltyStatus[] = ['pending', 'approved', 'appealed', 'cancelled'];
    for (let i = 0; i < 10; i++) {
      const emp = employees[i % employees.length];
      const type = types[i % types.length];
      const incidentDate = new Date();
      incidentDate.setDate(incidentDate.getDate() - (i + 1) * 8);
      const decisionDate = new Date(incidentDate);
      decisionDate.setDate(decisionDate.getDate() + 3);
      list.push({
        id: this.generateId(),
        penaltyNumber: PenaltyService.nextPenaltyNumber(),
        employeeId: emp.id,
        employeeName: emp.fullName,
        type,
        reason: reasons[i % reasons.length],
        incidentDate,
        decisionDate,
        decisionNumber: `قرار ${100 + i} لسنة ${new Date().getFullYear()}`,
        deductionDays: type === 'deduction' ? (i % 3) + 1 : undefined,
        suspensionDays: type === 'suspension' ? (i % 2) + 1 : undefined,
        status: statuses[i % 4],
        approvedBy: 'الإدارة',
        notes: i % 2 === 0 ? 'تم التحقق من الواقعة.' : undefined,
      });
    }
    PenaltyService.nextSeq = list.length + 1;
    this.penaltiesSubject.next(list);
  }

  getAll(): Observable<Penalty[]> {
    return this.penalties$.pipe(map((arr) => [...arr]));
  }

  getList(): Penalty[] {
    return this.penaltiesSubject.getValue();
  }

  getById(id: string): Penalty | undefined {
    return this.penaltiesSubject.getValue().find((p) => p.id === id);
  }

  getByEmployeeId(employeeId: string): Penalty[] {
    return this.penaltiesSubject.getValue().filter((p) => p.employeeId === employeeId);
  }

  getStatsByEmployee(employeeId: string): { type: PenaltyType; count: number }[] {
    const list = this.getByEmployeeId(employeeId);
    const map = new Map<PenaltyType, number>();
    for (const p of list) {
      map.set(p.type, (map.get(p.type) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }

  create(input: Omit<Penalty, 'id' | 'penaltyNumber'>): Penalty {
    const penalty: Penalty = {
      ...input,
      id: this.generateId(),
      penaltyNumber: PenaltyService.nextPenaltyNumber(),
    };
    const next = [...this.penaltiesSubject.getValue(), penalty];
    this.penaltiesSubject.next(next);
    return penalty;
  }

  update(id: string, patch: Partial<Penalty>): Penalty | null {
    const list = this.penaltiesSubject.getValue();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) return null;
    const updated = { ...list[index], ...patch };
    const next = [...list];
    next[index] = updated;
    this.penaltiesSubject.next(next);
    return updated;
  }

  delete(id: string): boolean {
    const list = this.penaltiesSubject.getValue();
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length === list.length) return false;
    this.penaltiesSubject.next(filtered);
    return true;
  }

  /**
   * Search/filter penalties by employee, type, status, date range, and text (reason, decisionNumber, employeeName).
   */
  search(filter: PenaltyFilter): Penalty[] {
    let list = [...this.penaltiesSubject.getValue()];
    if (filter.employeeId != null && filter.employeeId !== '') {
      list = list.filter((p) => p.employeeId === filter.employeeId);
    }
    if (filter.type != null) {
      list = list.filter((p) => p.type === filter.type);
    }
    if (filter.status != null) {
      list = list.filter((p) => p.status === filter.status);
    }
    if (filter.dateFrom != null) {
      const from = new Date(filter.dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter((p) => new Date(p.incidentDate) >= from);
    }
    if (filter.dateTo != null) {
      const to = new Date(filter.dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((p) => new Date(p.incidentDate) <= to);
    }
    const q = (filter.searchText ?? '').trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.reason.toLowerCase().includes(q) ||
          p.decisionNumber.toLowerCase().includes(q) ||
          p.employeeName.toLowerCase().includes(q) ||
          p.penaltyNumber.toLowerCase().includes(q)
      );
    }
    return list;
  }

  static getTypeLabel(type: PenaltyType): string {
    return PENALTY_TYPE_LABELS[type] ?? type;
  }

  static getStatusLabel(status: PenaltyStatus): string {
    return PENALTY_STATUS_LABELS[status] ?? status;
  }
}
