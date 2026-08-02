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
    path: 'shifts/new',
    loadComponent: () =>
      import('./shift-form/shift-form.component').then((m) => m.ShiftFormComponent),
  },
  {
    path: 'shifts/:id/edit',
    loadComponent: () =>
      import('./shift-form/shift-form.component').then((m) => m.ShiftFormComponent),
  },
  {
    path: 'employee-plans',
    loadComponent: () =>
      import('./employee-plans/employee-plans.component').then((m) => m.EmployeePlansComponent),
  },
  {
    path: 'employee-schedule',
    loadComponent: () =>
      import('./employee-schedule-calendar/employee-schedule-calendar.component').then(
        (m) => m.EmployeeScheduleCalendarComponent
      ),
  },
  {
    path: 'employee-attendance',
    loadComponent: () =>
      import('./employee-attendance/employee-attendance.component').then((m) => m.EmployeeAttendanceComponent),
  },
  {
    path: 'calculation-workbench',
    loadComponent: () =>
      import('./calculation-workbench/calculation-workbench.component').then((m) => m.CalculationWorkbenchComponent),
  },
  {
    path: 'calculation-runs',
    loadComponent: () =>
      import('./calculation-runs/calculation-runs.component').then((m) => m.CalculationRunsComponent),
  },
  {
    path: 'month-plan-template',
    loadComponent: () =>
      import('./month-plan-template/month-plan-template.component').then((m) => m.MonthPlanTemplateComponent),
  },
  {
    path: 'plans',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./month-plan-list/month-plan-list.component').then((m) => m.MonthPlanListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./month-plan-form/month-plan-form.component').then((m) => m.MonthPlanFormComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./month-plan-view/month-plan-view.component').then((m) => m.MonthPlanViewComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./month-plan-form/month-plan-form.component').then((m) => m.MonthPlanFormComponent),
      },
      {
        path: ':id/employees',
        loadComponent: () =>
          import('./employee-plans/employee-plans.component').then((m) => m.EmployeePlansComponent),
      },
      {
        path: ':id/schedules',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./schedule-list/schedule-list.component').then((m) => m.ScheduleListComponent),
          },
          {
            path: 'bulk',
            loadComponent: () =>
              import('./schedule-list/plan-schedule-bulk-form.component').then((m) => m.PlanScheduleBulkFormComponent),
          },
          // Bulk and single schedule forms will be added here
        ]
      }
    ]
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./time-attendance-settings/time-attendance-settings.component').then((m) => m.TimeAttendanceSettingsComponent),
  },
  {
    path: 'devices',
    loadComponent: () =>
      import('./devices/devices.component').then((m) => m.DevicesComponent),
  },
  {
    path: 'employee-enroll-links',
    loadComponent: () =>
      import('./employee-enroll-links/employee-enroll-links.component').then(
        (m) => m.EmployeeEnrollLinksComponent
      ),
  },
];
