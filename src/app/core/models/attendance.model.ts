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
  status: 'present' | 'absent' | 'late' | 'excused' | 'vacation' | 'sick_leave';
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
