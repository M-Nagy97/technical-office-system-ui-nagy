import { AttendanceRecord, AttendanceStatus } from '../models/attendance.model';
import { Employee } from '../models/employee.model';

const REQUIRED_HOURS = 8;
const WORK_START = '08:00';
const WORK_END = '16:00';

function generateAttendanceId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function randomStatus(): AttendanceStatus {
  const r = Math.random();
  if (r < 0.02) return 'absent';
  if (r < 0.08) return 'late';
  if (r < 0.09) return 'vacation';
  if (r < 0.10) return 'sick_leave';
  if (r < 0.11) return 'excused';
  return 'present';
}

function timesForStatus(status: AttendanceStatus): {
  checkIn: string;
  checkOut: string;
  workHours: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
} {
  if (status === 'absent' || status === 'vacation' || status === 'sick_leave' || status === 'excused') {
    return {
      checkIn: '--:--',
      checkOut: '--:--',
      workHours: 0,
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
    };
  }
  if (status === 'late') {
    const lateM = Math.floor(Math.random() * 60) + 5;
    const checkIn = addMinutesToTime(WORK_START, lateM);
    return {
      checkIn,
      checkOut: WORK_END,
      workHours: REQUIRED_HOURS - lateM / 60,
      lateMinutes: lateM,
      earlyLeaveMinutes: 0,
    };
  }
  return {
    checkIn: WORK_START,
    checkOut: WORK_END,
    workHours: REQUIRED_HOURS,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
  };
}

export function generateMockAttendanceRecords(
  employees: Employee[],
  year = new Date().getFullYear(),
  month = new Date().getMonth()
): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (const emp of employees) {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (date.getDay() === 5 || date.getDay() === 6) continue; // skip Fri, Sat
      const status = randomStatus();
      const { checkIn, checkOut, workHours, lateMinutes, earlyLeaveMinutes } = timesForStatus(status);
      records.push({
        id: generateAttendanceId(),
        employeeId: emp.id,
        employeeName: emp.fullName,
        date: new Date(date),
        checkIn,
        checkOut,
        workHours,
        requiredHours: REQUIRED_HOURS,
        lateMinutes,
        earlyLeaveMinutes,
        status,
      });
    }
  }

  return records;
}
