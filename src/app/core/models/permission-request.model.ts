export enum PermissionDurationType {
  TimeRange = 0,
  HalfDay = 1,
}

export enum HalfDayPeriod {
  Morning = 0,
  Afternoon = 1,
}

export enum PermissionRequestStatus {
  Pending = 1,
  Approved = 2,
  Rejected = 3,
  Cancelled = 4,
}

export interface PermissionRequestDto {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;              // YYYY-MM-DD
  durationType: PermissionDurationType;
  durationTypeName?: string;
  fromTime: string | null;   // "HH:mm:ss" or "HH:mm"
  toTime: string | null;
  halfDayPeriod: HalfDayPeriod | null;
  halfDayPeriodName?: string | null;
  reason: string | null;
  status: PermissionRequestStatus;
  statusName?: string;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdDate?: string;
}

export interface SubmitPermissionRequestCommand {
  employeeId: string;
  date: string;
  durationType: PermissionDurationType;
  fromTime?: string;
  toTime?: string;
  halfDayPeriod?: HalfDayPeriod;
  reason?: string;
}

export interface PermissionRequestFilter {
  employeeId?: string;
  status?: PermissionRequestStatus;
  fromDate?: string;
  toDate?: string;
}
