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
    return this.api.employeesGetAll().pipe(
      map(response => {
        console.log('API response for employees:', response);
        const dtos = response.data || [];
        const employees = this.mapDtosToEmployees(dtos as any[]);
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
    return this.api.employeesGetById(id).pipe(
      map(response => response.data ? this.mapDtoToEmployee(response.data) : undefined)
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
    return this.api.employeesCreate(command);
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
      return this.api.employeesUpdate(id, command);
    }
    return of(null);
  }

  /**
   * Delete employee.
   */
  delete(id: string): Observable<any> {
    const current = this.employeesSubject.getValue();
    this.employeesSubject.next(current.filter(e => e.id !== id));
    return this.api.employeesDelete(id);
  }

  /** ZKTeco device User ID = employee code in HR */
  updateEmployeeCode(id: string, employeeCode: string): Observable<{ success?: boolean; data?: boolean }> {
    return this.http.patch<{ success?: boolean; data?: boolean }>(
      `https://localhost:8500/api/employees/${id}/employee-code`,
      { id, employeeCode },
    );
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

  /**
   * Map API EmployeeDto (employeeCode, arabicName, hireDate, contacts[], addresses[], etc.)
   * to frontend Employee model (employeeNumber, fullName, appointmentDate, phone, email, etc.).
   */
  private mapDtoToEmployee(dto: any): Employee {
    const primaryContact = dto.contacts && dto.contacts.length > 0 ? dto.contacts[0] : null;
    const primaryAddress = (dto.addresses && Array.isArray(dto.addresses))
      ? (dto.addresses.find((a: any) => a.isPrimary) || dto.addresses[0])
      : null;
    const firstExperience = dto.experiences && dto.experiences.length > 0 ? dto.experiences[0] : null;

    const fullName = dto.arabicName?.trim()
      || [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim()
      || '—';

    const statusMap: Record<number, Employee['status']> = {
      1: 'active',
      2: 'suspended',
      3: 'terminated',
      4: 'retired',
    };

    return {
      id: dto.id ?? '',
      employeeNumber: dto.employeeCode ?? '',
      fullName,
      firstName: dto.firstName ?? '',
      secondName: '',
      thirdName: '',
      lastName: dto.lastName ?? '',
      nationalId: '',
      gender: (dto.genderId === 1 ? 'male' : 'female') as Employee['gender'],
      birthDate: dto.birthDate ? new Date(dto.birthDate) : new Date(0),
      birthPlace: '',
      nationality: '',
      religion: '',
      maritalStatus: 'single' as Employee['maritalStatus'],
      phone: primaryContact?.phone ?? primaryContact?.mobile ?? '',
      alternatePhone: primaryContact?.mobile ?? undefined,
      email: primaryContact?.email ?? undefined,
      address: primaryAddress?.addressLine ?? '',
      photo: undefined,
      appointmentDate: dto.hireDate ? new Date(dto.hireDate) : new Date(0),
      appointmentDecisionNumber: '',
      appointmentDecisionDate: new Date(0),
      jobTitle: firstExperience?.jobTitle ?? '',
      jobGrade: '',
      department: '',
      section: '',
      workLocation: '',
      employmentType: 'permanent',
      status: (dto.statusId != null && statusMap[dto.statusId]) ? statusMap[dto.statusId] : 'active',
      educationLevel: '',
      educationField: '',
      graduationYear: 0,
      documents: (dto.documents || []).map((doc: any) => ({
        id: doc.id ?? '',
        type: 'other' as const,
        name: doc.documentNumber ?? '',
        fileUrl: doc.fileUrl ?? '',
        uploadDate: doc.issueDate ? new Date(doc.issueDate) : new Date(0),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
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
