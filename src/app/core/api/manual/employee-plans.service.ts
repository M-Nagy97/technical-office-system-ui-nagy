import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  EmployeePlanListItemDto, 
  AssignEmployeeCommand, 
  UnassignEmployeeCommand,
  ApiResult
} from './employee-plans.models';

@Injectable({
  providedIn: 'root'
})
export class EmployeePlansService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `/api/EmployeePlans`;

  employeesByPlanGet(planId: string): Observable<ApiResult<EmployeePlanListItemDto[]>> {
    return this.http.get<ApiResult<EmployeePlanListItemDto[]>>(`${this.baseUrl}/plan/${planId}`);
  }

  assignEmployeeCreate(command: AssignEmployeeCommand): Observable<ApiResult<boolean>> {
    return this.http.post<ApiResult<boolean>>(`${this.baseUrl}/assign`, command);
  }

  unassignEmployeeCreate(command: UnassignEmployeeCommand): Observable<ApiResult<boolean>> {
    return this.http.post<ApiResult<boolean>>(`${this.baseUrl}/unassign`, command);
  }
}
