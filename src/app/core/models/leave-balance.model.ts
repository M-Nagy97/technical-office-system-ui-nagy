export interface EmployeeLeaveBalanceDto {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeArabicName: string;
  year: number;
  allowedDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface InitialiseLeaveBalanceCommand {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allowedDays: number;
}
