export interface ApiResult<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface EmployeePlanListItemDto {
  employeeId?: string;
  employeeName?: string;
  employeeCode?: string;
  planId?: string;
  planName?: string;
}

export interface AssignEmployeeCommand {
  employeeId: string;
  planId: string;
}

export interface UnassignEmployeeCommand {
  employeeId: string;
  planId: string;
}
