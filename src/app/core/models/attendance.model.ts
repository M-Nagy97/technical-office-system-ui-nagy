export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'vacation' | 'sick_leave';

/**
 * سجل حضور يومي لموظف
 */
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: Date;
  checkIn: string;   // وقت الحضور HH:mm
  checkOut: string; // وقت الانصراف HH:mm
  workHours: number;      // ساعات العمل الفعلية
  requiredHours: number;  // ساعات العمل المطلوبة
  lateMinutes: number;    // دقائق التأخير
  earlyLeaveMinutes: number; // دقائق الانصراف المبكر
  status: AttendanceStatus;
  notes?: string;
}

/**
 * ملخص حضور شهري لموظف
 */
export interface AttendanceSummary {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  vacationDays: number;
  totalLateMinutes: number;
}

export interface RecordManualPunchRequest {
  employeeId: string;
  punchTime: string; // ISO 8601
  punchType: 0 | 1;  // 0 = In, 1 = Out
  notes?: string;
}

