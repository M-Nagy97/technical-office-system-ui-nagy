import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap, from, of } from 'rxjs';
import { Employee } from '../models/employee.model';
import { EmployeesService as GeneratedEmployeesService } from '../api/generated/api/employees.service';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  employees$ = this.employeesSubject.asObservable();

  private static nextSequence = 1000;

  constructor(
    private http: HttpClient,
    private api: GeneratedEmployeesService
  ) {}

  /**
   * Fetch all employees from API and update local state.
   */
  fetchAll(): Observable<Employee[]> {
    return this.api.apiEmployeesGet().pipe(
      map(dtos => {
        console.log('API response for employees:', dtos);
        const employees = this.mapDtosToEmployees(dtos);
        this.employeesSubject.next(employees);
        return  employees;
      })
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  /**
   * Generate next employee number in format EMP-NNNN (e.g. EMP-1000).
   */
  private static generateEmployeeNumber(): string {
    return `EMP-${this.nextSequence++}`;
  }

  /**
   * Get all employees.
   */
  getAll(): Observable<Employee[]> {
    return this.employees$;
  }

  /**
   * Get current list (sync).
   */
  getList(): Employee[] {
    return this.employeesSubject.getValue();
  }

  /**
   * Get employee by id from API.
   */
  getById(id: string): Observable<Employee | undefined> {
    return this.api.apiEmployeesIdGet(id).pipe(
      map(dto => dto ? this.mapDtoToEmployee(dto) : undefined)
    );
  }

  /**
   * Get employee by id from local state.
   */
  getByIdSync(id: string): Employee | undefined {
    return this.employeesSubject.getValue().find(e => e.id === id);
  }

  /**
   * Create new employee.
   */
  create(employee: Partial<Employee>): Observable<any> {
    const newEmployee = {
      ...employee,
      id: this.generateId(),
      employeeNumber: EmployeeService.generateEmployeeNumber()
    } as Employee;

    // Update local state
    const current = this.employeesSubject.getValue();
    this.employeesSubject.next([...current, newEmployee]);

    // API call - mapping to command object
    const command = this.mapToCreateCommand(newEmployee);
    return this.api.apiEmployeesPost(command);
  }

  /**
   * Update existing employee.
   */
  update(id: string, patch: Partial<Employee>): Observable<any> {
    const current = this.employeesSubject.getValue();
    const index = current.findIndex(e => e.id === id);

    if (index !== -1) {
      const updated = { ...current[index], ...patch };
      const newList = [...current];
      newList[index] = updated;
      this.employeesSubject.next(newList);

      const command = this.mapToUpdateCommand(updated);
      return this.api.apiEmployeesIdPut(id, command);
    }
    return of(null);
  }

  /**
   * Delete employee.
   */
  delete(id: string): Observable<any> {
    const current = this.employeesSubject.getValue();
    this.employeesSubject.next(current.filter(e => e.id !== id));
    return this.api.apiEmployeesIdDelete(id);
  }

  /**
   * Mapping logic (Internal)
   */
  private mapDtosToEmployees(dtos: any[]): Employee[] {
    if (!dtos) return [];
    return dtos.map(dto => this.mapDtoToEmployee(dto));
  }

  private mapToCreateCommand(employee: Employee): any {
    return {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.jobTitle, // Assuming position maps to jobTitle
      status: employee.status,
      joinDate: employee.appointmentDate // Assuming joinDate maps to appointmentDate
    };
  }

  private mapToUpdateCommand(employee: Employee): any {
    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      position: employee.jobTitle, // Assuming position maps to jobTitle
      status: employee.status,
      joinDate: employee.appointmentDate // Assuming joinDate maps to appointmentDate
    };
  }

  private mapDtoToEmployee(dto: any): Employee {
    return {
      id: dto.id,
      employeeNumber: dto.employeeNumber,
      fullName: dto.fullName,
      firstName: dto.firstName,
      secondName: dto.secondName,
      thirdName: dto.thirdName,
      lastName: dto.lastName,
      nationalId: dto.nationalId,
      gender: dto.gender?.toLowerCase() as any,
      birthDate: new Date(dto.birthDate),
      birthPlace: dto.birthPlace,
      maritalStatus: dto.maritalStatus?.toLowerCase() as any,
      phone: dto.phone,
      email: dto.email,
      address: dto.address?.addressLine1 || '',
      appointmentDate: new Date(dto.appointmentDate),
      department: dto.department,
      jobTitle: dto.jobTitle,
      employmentType: dto.employmentType?.toLowerCase() as any,
      status: dto.status?.toLowerCase() as any,
      // ... Add more mappings as needed based on DTO structure
    } as Employee;
  }

  /**
   * Search employees by text (fullName, employeeNumber, nationalId, jobTitle, department, phone, email).
   */
  search(query: string): Observable<Employee[]> {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return this.getAll();
    return this.employees$.pipe(
      map((list) =>
        list.filter(
          (e) =>
            e.fullName.toLowerCase().includes(q) ||
            e.employeeNumber.toLowerCase().includes(q) ||
            e.nationalId.toLowerCase().includes(q) ||
            e.jobTitle.toLowerCase().includes(q) ||
            e.department.toLowerCase().includes(q) ||
            e.phone.toLowerCase().includes(q) ||
            (e.email?.toLowerCase().includes(q) ?? false)
        )
      )
    );
  }

  /**
   * Get search results synchronously.
   */
  searchSync(query: string): Employee[] {
    const q = (query ?? '').trim().toLowerCase();
    if (!q) return this.getList();
    return this.getList().filter(
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
}
