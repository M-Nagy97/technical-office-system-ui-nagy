export const ErpPermissions = {
  hrRead: 'hr.employees.read',
  hrWrite: 'hr.employees.write',
  payrollRead: 'payroll.read',
  payrollWrite: 'payroll.write',
  timeAttendanceRead: 'timeattendance.read',
  timeAttendanceWrite: 'timeattendance.write',
  leaveRead: 'leave.read',
  leaveWrite: 'leave.write',
  custodyRead: 'custody.read',
  custodyWrite: 'custody.write',
  userRead: 'user.read',
  userWrite: 'user.write',
} as const;

export type ErpModuleKey =
  | 'dashboard'
  | 'employees'
  | 'leave'
  | 'attendance'
  | 'custody'
  | 'payroll'
  | 'penalties'
  | 'admin';

export const MODULE_PERMISSIONS: Record<
  Exclude<ErpModuleKey, 'dashboard'>,
  { read: string; write: string }
> = {
  employees: { read: ErpPermissions.hrRead, write: ErpPermissions.hrWrite },
  penalties: { read: ErpPermissions.hrRead, write: ErpPermissions.hrWrite },
  leave: { read: ErpPermissions.leaveRead, write: ErpPermissions.leaveWrite },
  attendance: { read: ErpPermissions.timeAttendanceRead, write: ErpPermissions.timeAttendanceWrite },
  custody: { read: ErpPermissions.custodyRead, write: ErpPermissions.custodyWrite },
  payroll: { read: ErpPermissions.payrollRead, write: ErpPermissions.payrollWrite },
  admin: { read: ErpPermissions.userRead, write: ErpPermissions.userWrite },
};
