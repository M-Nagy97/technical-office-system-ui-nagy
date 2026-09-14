import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, map, tap, of, catchError, throwError, switchMap } from 'rxjs';
import { Employee, EmployeeDocument, EmployeeFilter } from '../models/employee.model';
import { EmployeesService as GeneratedEmployeesService } from '../api/generated/api/employees.service';
import { EmployeeMapper } from '../mappers/employee.mapper';
import { environment } from '../../../environments/environment';
import { SKIP_GLOBAL_ERROR_NOTIFICATION } from '../interceptors/error.interceptor';

export function filterEmployees(list: Employee[], filter: EmployeeFilter): Employee[] {
  let result = list;
  const q = (filter.query ?? '').trim().toLowerCase();

  if (q) {
    result = result.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q) ||
        e.nationalId.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        (e.email?.toLowerCase().includes(q) ?? false)
    );
  }

  if (filter.department) {
    result = result.filter((e) => e.department === filter.department);
  }

  if (filter.status) {
    result = result.filter((e) => e.status === filter.status);
  }

  if (filter.employmentType) {
    result = result.filter((e) => e.employmentType === filter.employmentType);
  }

  return result;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(GeneratedEmployeesService);

  private readonly employeesState = signal<Employee[]>([]);
  readonly employees = this.employeesState.asReadonly();
  readonly employees$ = toObservable(this.employeesState);

  readonly count = computed(() => this.employeesState().length);

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  fetchAll(): Observable<Employee[]> {
    return this.api.employeesGetAll().pipe(
      map((response) => {
        const dtos = response.data || [];
        const employees = EmployeeMapper.toDomainList(dtos);
        this.employeesState.set(employees);
        return employees;
      })
    );
  }

  getAll(): Observable<Employee[]> {
    return this.employees$;
  }

  getList(): Employee[] {
    return this.employeesState();
  }

  getById(id: string): Observable<Employee | undefined> {
    return this.api.employeesGetById(id).pipe(
      map((response) => {
        if (response.data) {
          const emp = EmployeeMapper.toDomain(response.data);
          this.employeesState.update((list) => {
            const idx = list.findIndex((e) => e.id === id);
            if (idx === -1) return [...list, emp];
            const next = [...list];
            next[idx] = emp;
            return next;
          });
          return emp;
        }
        return undefined;
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(this.employeesState().find((e) => e.id === id));
        }
        return throwError(() => err);
      })
    );
  }

  getByIdSync(id: string): Employee | undefined {
    return this.employeesState().find((e) => e.id === id);
  }

  create(employee: Partial<Employee>): Observable<{ success?: boolean; data?: string }> {
    const tempId = this.generateId();
    const snapshot = this.employeesState();
    const newEmployee: Employee = {
      ...employee,
      id: tempId,
      employeeNumber: employee.employeeNumber?.trim() || '',
      fullName: employee.fullName || `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
      firstName: employee.firstName || '',
      secondName: employee.secondName || '',
      thirdName: employee.thirdName || '',
      lastName: employee.lastName || '',
      gender: employee.gender || 'male',
      birthDate: employee.birthDate || new Date(0),
      birthPlace: employee.birthPlace || '',
      nationality: employee.nationality || '',
      religion: employee.religion || '',
      maritalStatus: employee.maritalStatus || 'single',
      nationalId: employee.nationalId || '',
      phone: employee.phone || '',
      alternatePhone: employee.alternatePhone,
      email: employee.email,
      address: employee.address || '',
      appointmentDate: employee.appointmentDate || new Date(),
      appointmentDecisionNumber: employee.appointmentDecisionNumber || '',
      appointmentDecisionDate: employee.appointmentDecisionDate || new Date(),
      jobTitle: employee.jobTitle || '',
      jobGrade: employee.jobGrade || '',
      department: employee.department || '',
      section: employee.section || '',
      workLocation: employee.workLocation || '',
      employmentType: employee.employmentType || 'permanent',
      status: employee.status || 'active',
      educationLevel: employee.educationLevel || '',
      educationField: employee.educationField || '',
      graduationYear: employee.graduationYear || 0,
      documents: employee.documents || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.employeesState.update((list) => [...list, newEmployee]);

    const command = EmployeeMapper.toCreateCommand(newEmployee);
    return this.api.employeesCreate(command).pipe(
      tap((res) => {
        const realId = res?.data;
        if (realId) {
          this.employeesState.update((list) =>
            list.map((e) => (e.id === tempId ? { ...e, id: realId } : e))
          );
        }
      }),
      catchError((err) => {
        this.employeesState.set(snapshot);
        return throwError(() => err);
      })
    );
  }

  update(id: string, patch: Partial<Employee>): Observable<unknown> {
    const snapshot = this.employeesState();
    const current = snapshot;
    const index = current.findIndex((e) => e.id === id);

    let updated: Employee;
    if (index !== -1) {
      updated = { ...current[index], ...patch, updatedAt: new Date() };
      this.employeesState.update((list) => {
        const newList = [...list];
        newList[index] = updated;
        return newList;
      });
    } else {
      updated = { ...patch, id, updatedAt: new Date() } as Employee;
      this.employeesState.update((list) => [...list, updated]);
    }

    const command = EmployeeMapper.toUpdateCommand(id, updated);
    return this.api.employeesUpdate(id, command).pipe(
      catchError((err) => {
        this.employeesState.set(snapshot);
        return throwError(() => err);
      })
    );
  }

  /**
   * Append documents after a fresh GetById so existing document Ids are kept.
   * Only syncs the documents collection — other child collections are left untouched
   * (backend skips null lists; empty [] would delete orphans and can throw concurrency errors).
   */
  addDocuments(employeeId: string, newDocs: EmployeeDocument[]): Observable<unknown> {
    return this.getById(employeeId).pipe(
      switchMap((emp) => {
        if (!emp) {
          return throwError(() => new Error('Employee not found'));
        }
        const snapshot = this.employeesState();
        const updated: Employee = {
          ...emp,
          documents: [...(emp.documents || []), ...newDocs],
          updatedAt: new Date(),
        };
        this.employeesState.update((list) => {
          const idx = list.findIndex((e) => e.id === employeeId);
          if (idx === -1) return [...list, updated];
          const next = [...list];
          next[idx] = updated;
          return next;
        });

        const command = EmployeeMapper.toUpdateCommand(employeeId, updated);
        command.contacts = null;
        command.addresses = null;
        command.educations = null;
        command.experiences = null;

        return this.api.employeesUpdate(employeeId, command).pipe(
          catchError((err) => {
            this.employeesState.set(snapshot);
            return throwError(() => err);
          })
        );
      })
    );
  }

  delete(id: string): Observable<unknown> {
    const snapshot = this.employeesState();
    this.employeesState.update((list) => list.filter((e) => e.id !== id));
    return this.api.employeesDelete(id).pipe(
      catchError((err) => {
        this.employeesState.set(snapshot);
        return throwError(() => err);
      })
    );
  }

  updateEmployeeCode(id: string, employeeCode: string): Observable<{ success?: boolean; data?: boolean }> {
    return this.http.patch<{ success?: boolean; data?: boolean }>(
      `${environment.apiBaseUrl}/api/Employees/${id}/employee-code`,
      { id, employeeCode }
    );
  }

  setPosition(
    employeeId: string,
    body: { jobPositionId: string; organizationUnitId: string; fromDate: string; isPrimary?: boolean }
  ): Observable<{ success?: boolean; data?: boolean }> {
    return this.http.put<{ success?: boolean; data?: boolean }>(
      `${environment.apiBaseUrl}/api/Employees/${employeeId}/position`,
      { employeeId, ...body },
      { context: new HttpContext().set(SKIP_GLOBAL_ERROR_NOTIFICATION, true) }
    );
  }

  filter(filter: EmployeeFilter): Employee[] {
    return filterEmployees(this.employeesState(), filter);
  }

  search(query: string): Observable<Employee[]> {
    return this.employees$.pipe(map((list) => filterEmployees(list, { query })));
  }

  searchSync(query: string): Employee[] {
    return filterEmployees(this.employeesState(), { query });
  }
}
