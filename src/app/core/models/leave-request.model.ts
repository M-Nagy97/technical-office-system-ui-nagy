export enum LeaveRequestStatus {
  Draft = 0,
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4,
}

export interface LeaveRequestDto {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  leaveTypeArabicName?: string;
  startDate: string;         // YYYY-MM-DD
  endDate: string;           // YYYY-MM-DD
  totalDays: number;
  reason: string | null;
  attachmentUrl: string | null;
  status: LeaveRequestStatus;
  statusName?: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  warningAlerts?: string | null;
  warningAlertsAr?: string | null;
  createdDate?: string;
}

export interface SubmitLeaveRequestCommand {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
  attachmentUrl?: string;
}

export interface SubmitLeaveRequestResponse {
  id: string;
  warningAlerts?: string | null;
  warningAlertsAr?: string | null;
}

export interface LeaveRequestFilter {
  employeeId?: string;
  leaveTypeId?: string;
  status?: LeaveRequestStatus;
  fromDate?: string;
  toDate?: string;
}
