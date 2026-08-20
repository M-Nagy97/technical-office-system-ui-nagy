import { Injectable, inject, signal, computed } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, map } from 'rxjs';
import { EmployeeService } from './employee.service';
import {
  Penalty,
  PenaltyType,
  PenaltyStatus,
  PenaltyFilter,
  CreatePenaltyInput,
  UpdatePenaltyInput,
  PENALTY_TYPE_LABELS,
  PENALTY_STATUS_LABELS,
} from '../models/penalty.model';
import { generateMockPenalties } from '../mocks/penalty.mock';

export function filterPenalties(list: Penalty[], filter: PenaltyFilter): Penalty[] {
  let result = list;

  if (filter.employeeId != null && filter.employeeId !== '') {
    result = result.filter((p) => p.employeeId === filter.employeeId);
  }
  if (filter.type != null) {
    result = result.filter((p) => p.type === filter.type);
  }
  if (filter.status != null) {
    result = result.filter((p) => p.status === filter.status);
  }
  if (filter.dateFrom != null) {
    const from = new Date(filter.dateFrom);
    from.setHours(0, 0, 0, 0);
    result = result.filter((p) => new Date(p.incidentDate) >= from);
  }
  if (filter.dateTo != null) {
    const to = new Date(filter.dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((p) => new Date(p.incidentDate) <= to);
  }

  const q = (filter.searchText ?? '').trim().toLowerCase();
  if (q) {
    result = result.filter(
      (p) =>
        p.reason.toLowerCase().includes(q) ||
        p.decisionNumber.toLowerCase().includes(q) ||
        p.employeeName.toLowerCase().includes(q) ||
        p.penaltyNumber.toLowerCase().includes(q)
    );
  }

  return result;
}

@Injectable({
  providedIn: 'root',
})
export class PenaltyService {
  private readonly employeeService = inject(EmployeeService);
  private readonly penaltiesState = signal<Penalty[]>([]);

  readonly penalties = this.penaltiesState.asReadonly();
  readonly penalties$ = toObservable(this.penaltiesState);
  readonly count = computed(() => this.penaltiesState().length);

  private static nextSeq = 1;

  constructor() {
    this.initMockData();
  }

  private generateId(): string {
    return `pen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  private static nextPenaltyNumber(): string {
    const y = new Date().getFullYear();
    const n = String(PenaltyService.nextSeq++).padStart(4, '0');
    return `PEN-${y}-${n}`;
  }

  private initMockData(): void {
    const employees = this.employeeService.getList();
    if (employees.length > 0) {
      const list = generateMockPenalties(employees);
      PenaltyService.nextSeq = list.length + 1;
      this.penaltiesState.set(list);
    }
  }

  getAll(): Observable<Penalty[]> {
    return this.penalties$;
  }

  getList(): Penalty[] {
    return this.penaltiesState();
  }

  getById(id: string): Penalty | undefined {
    return this.penaltiesState().find((p) => p.id === id);
  }

  getByEmployeeId(employeeId: string): Penalty[] {
    return this.penaltiesState().filter((p) => p.employeeId === employeeId);
  }

  getStatsByEmployee(employeeId: string): { type: PenaltyType; count: number }[] {
    const list = this.getByEmployeeId(employeeId);
    const map = new Map<PenaltyType, number>();
    for (const p of list) {
      map.set(p.type, (map.get(p.type) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  }

  create(input: CreatePenaltyInput): Penalty {
    const penalty: Penalty = {
      ...input,
      id: this.generateId(),
      penaltyNumber: PenaltyService.nextPenaltyNumber(),
    };
    this.penaltiesState.update((list) => [...list, penalty]);
    return penalty;
  }

  update(id: string, patch: UpdatePenaltyInput): Penalty | null {
    const list = this.penaltiesState();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updated: Penalty = { ...list[index], ...patch };
    this.penaltiesState.update((current) => {
      const copy = [...current];
      copy[index] = updated;
      return copy;
    });

    return updated;
  }

  delete(id: string): boolean {
    const initialLen = this.penaltiesState().length;
    this.penaltiesState.update((list) => list.filter((p) => p.id !== id));
    return this.penaltiesState().length < initialLen;
  }

  search(filter: PenaltyFilter): Penalty[] {
    return filterPenalties(this.penaltiesState(), filter);
  }

  static getTypeLabel(type: PenaltyType): string {
    return PENALTY_TYPE_LABELS[type] ?? type;
  }

  static getStatusLabel(status: PenaltyStatus): string {
    return PENALTY_STATUS_LABELS[status] ?? status;
  }
}

