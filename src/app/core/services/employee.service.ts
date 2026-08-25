import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, map, tap, of, catchError } from 'rxjs';
import { Employee, EmployeeFilter } from '../models/employee.model';
import { EmployeesService as GeneratedEmployeesService } from '../api/generated/api/employees.service';
import { EmployeeMapper } from '../mappers/employee.mapper';
import { environment } from '../../../environments/environment';

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

  private static nextSequence = 1000;

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  private static generateEmployeeNumber(): string {
    return `EMP-${this.nextSequence++}`;
  }

  /**
   * Fetch all employees from API and update signals state.
   */
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

  /**
   * Get all employees observable.
   */
  getAll(): Observable<Employee[]> {
    return this.employees$;
  }

  /**
   * Get current list snapshot (synchronous).
   */
  getList(): Employee[] {
    return this.employeesState();
  }

  /**
   * Get employee by ID from API.
   */
  getById(id: string): Observable<Employee | undefined> {
    return this.api.employeesGetById(id).pipe(
      map((response) => {
        if (response.data) {
          const emp = EmployeeMapper.toDomain(response.data);
          const local = this.employeesState().find((e) => e.id === id);
          let finalEmp = emp;
          if (local) {
            finalEmp = {
              ...local,
              ...emp,
              nationalId: local.nationalId || emp.nationalId,
              secondName: emp.secondName || local.secondName,
              thirdName: emp.thirdName || local.thirdName,
              birthPlace: local.birthPlace || emp.birthPlace,
              nationality: local.nationality || emp.nationality,
              religion: local.religion || emp.religion,
              maritalStatus: emp.maritalStatus || local.maritalStatus,
              appointmentDecisionNumber: local.appointmentDecisionNumber || emp.appointmentDecisionNumber,
              appointmentDecisionDate: local.appointmentDecisionDate || emp.appointmentDecisionDate,
              jobGrade: local.jobGrade || emp.jobGrade,
              department: emp.department || local.department,
              section: emp.section || local.section,
              workLocation: emp.workLocation || local.workLocation,
              educationLevel: emp.educationLevel || local.educationLevel,
              educationField: emp.educationField || local.educationField,
              graduationYear: emp.graduationYear || local.graduationYear,
            };
            this.employeesState.update((list) =>
              list.map((e) => (e.id === id ? finalEmp : e))
            );
          } else {
            this.employeesState.update((list) => [...list, finalEmp]);
          }
          return finalEmp;
        }
        return this.employeesState().find((e) => e.id === id);
      }),
      catchError(() => {
        return of(this.employeesState().find((e) => e.id === id));
      })
    );
  }

  /**
   * Get employee by ID from local signals state.
   */
  getByIdSync(id: string): Employee | undefined {
    return this.employeesState().find((e) => e.id === id);
  }

  /**
   * Create a new employee.
   */
  create(employee: Partial<Employee>): Observable<any> {
    const tempId = this.generateId();
    const newEmployee: Employee = {
      ...employee,
      id: tempId,
      employeeNumber: employee.employeeNumber || EmployeeService.generateEmployeeNumber(),
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

    // Optimistically update local signals state
    this.employeesState.update((list) => [...list, newEmployee]);

    const command = EmployeeMapper.toCreateCommand(newEmployee);
    return this.api.employeesCreate(command).pipe(
      tap((res) => {
        const realId = res?.data;
        if (realId) {
          newEmployee.id = realId;
          this.employeesState.update((list) =>
            list.map((e) => (e.id === tempId ? { ...e, id: realId } : e))
          );
        }
      })
    );
  }

  /**
   * Update an existing employee.
   */
  update(id: string, patch: Partial<Employee>): Observable<unknown> {
    const current = this.employeesState();
    const index = current.findIndex((e) => e.id === id);

    let updated: Employee;
    if (index !== -1) {
      updated = {
        ...current[index],
        ...patch,
        updatedAt: new Date(),
      };

      this.employeesState.update((list) => {
        const newList = [...list];
        newList[index] = updated;
        return newList;
      });
    } else {
      updated = {
        ...patch,
        id,
        updatedAt: new Date(),
      } as Employee;

      this.employeesState.update((list) => [...list, updated]);
    }

    const command = EmployeeMapper.toUpdateCommand(id, updated);
    return this.api.employeesUpdate(id, command);
  }

  /**
   * Delete employee.
   */
  delete(id: string): Observable<unknown> {
    this.employeesState.update((list) => list.filter((e) => e.id !== id));
    return this.api.employeesDelete(id);
  }

  /**
   * Update employee hardware code for ZKTeco devices.
   */
  updateEmployeeCode(id: string, employeeCode: string): Observable<{ success?: boolean; data?: boolean }> {
    return this.http.patch<{ success?: boolean; data?: boolean }>(
      `${environment.apiBaseUrl}/api/employees/${id}/employee-code`,
      { id, employeeCode }
    );
  }

  /**
   * Filter employees with query and filter options.
   */
  filter(filter: EmployeeFilter): Employee[] {
    return filterEmployees(this.employeesState(), filter);
  }

  /**
   * Search employees by text query.
   */
  search(query: string): Observable<Employee[]> {
    return this.employees$.pipe(
      map((list) => filterEmployees(list, { query }))
    );
  }

  /**
   * Search employees synchronously.
   */
  searchSync(query: string): Employee[] {
    return filterEmployees(this.employeesState(), { query });
  }
}

