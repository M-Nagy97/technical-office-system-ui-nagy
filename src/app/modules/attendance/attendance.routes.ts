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
  {
    path: 'shifts',
    loadComponent: () =>
      import('./shift-list/shift-list.component').then((m) => m.ShiftListComponent),
  },
  {
    path: 'schedules',
    loadComponent: () =>
      import('./schedule-list/schedule-list.component').then((m) => m.ScheduleListComponent),
  },
  {
    path: 'month-plans',
    loadComponent: () =>
      import('./month-plan-list/month-plan-list.component').then((m) => m.MonthPlanListComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./time-attendance-settings/time-attendance-settings.component').then((m) => m.TimeAttendanceSettingsComponent),
  },
];
