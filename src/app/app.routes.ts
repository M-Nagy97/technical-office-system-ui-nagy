import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./modules/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'employees',
        loadChildren: () =>
          import('./modules/employees/employees.routes').then((m) => m.EMPLOYEE_ROUTES),
      },
      {
        path: 'attendance',
        loadChildren: () =>
          import('./modules/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES),
      },
      {
        path: 'leave',
        loadChildren: () =>
          import('./modules/leave/leave.routes').then((m) => m.LEAVE_ROUTES),
      },
      {
        path: 'penalties',
        loadChildren: () =>
          import('./modules/penalties/penalties.routes').then((m) => m.PENALTY_ROUTES),
      },
      {
        path: 'custody',
        loadChildren: () =>
          import('./modules/employee-custody/employee-custody.routes').then(
            (m) => m.EMPLOYEE_CUSTODY_ROUTES
          ),
      },
      {
        path: 'payroll',
        loadChildren: () =>
          import('./modules/payroll/payroll.routes').then((m) => m.PAYROLL_ROUTES),
      },
      {
        path: 'job-grades',
        loadChildren: () =>
          import('./modules/job-grades/job-grades.routes').then((m) => m.JOB_GRADES_ROUTES),
      },
      {
        path: 'job-positions',
        loadChildren: () =>
          import('./modules/job-positions/job-positions.routes').then((m) => m.JOB_POSITIONS_ROUTES),
      },
      {
        path: 'organization-units',
        loadChildren: () =>
          import('./modules/organization-units/organization-units.routes').then(
            (m) => m.ORGANIZATION_UNITS_ROUTES
          ),
      },
      {
        path: 'organization-structure',
        loadChildren: () =>
          import('./modules/organization-structure/organization-structure.routes').then(
            (m) => m.ORGANIZATION_STRUCTURE_ROUTES
          ),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
