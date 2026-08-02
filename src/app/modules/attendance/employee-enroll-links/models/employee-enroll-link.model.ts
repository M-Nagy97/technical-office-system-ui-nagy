export interface EmployeeEnrollLink {
  employeeId: string;
  employeeName: string;
  enrollNumber: string | null;
}

export interface ApiResult<T> {
  data: T;
  isSuccess?: boolean;
  message?: string;
}

export interface LinkEnrollRequest {
  enrollNumber: string;
}
