import { Routes } from '@angular/router';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./daily-attendance/daily-attendance.component').then((m) => m.DailyAttendanceComponent),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/reports.component').then((m) => m.ReportsComponent),
  },
];
