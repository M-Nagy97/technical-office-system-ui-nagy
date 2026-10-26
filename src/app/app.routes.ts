import { Routes } from '@angular/router';
import { ErpPermissions } from './core/auth/erp-permissions';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

const HR_ACCESS = [ErpPermissions.hrRead, ErpPermissions.hrWrite];
const LEAVE_ACCESS = [ErpPermissions.leaveRead, ErpPermissions.leaveWrite];
const ATTENDANCE_ACCESS = [ErpPermissions.timeAttendanceRead, ErpPermissions.timeAttendanceWrite];
const CUSTODY_ACCESS = [ErpPermissions.custodyRead, ErpPermissions.custodyWrite];
const PAYROLL_ACCESS = [ErpPermissions.payrollRead, ErpPermissions.payrollWrite];
const ADMIN_ACCESS = [ErpPermissions.userRead, ErpPermissions.userWrite];

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./modules/auth/auth-shell/auth-shell.component').then((m) => m.AuthShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () =>
          import('./modules/auth/login/login.component').then((m) => m.LoginComponent),
      },
    ],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./modules/admin/users/my-profile.component').then((m) => m.MyProfileComponent),
      },
      {
        path: 'admin',
        canActivate: [permissionGuard],
        data: { anyPermission: ADMIN_ACCESS },
        loadChildren: () => import('./modules/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./modules/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'employees',
        canActivate: [permissionGuard],
        data: { anyPermission: HR_ACCESS },
        loadChildren: () =>
          import('./modules/employees/employees.routes').then((m) => m.EMPLOYEE_ROUTES),
      },
      {
        path: 'attendance',
        canActivate: [permissionGuard],
        data: { anyPermission: ATTENDANCE_ACCESS },
        loadChildren: () =>
          import('./modules/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES),
      },
      {
        path: 'leave',
        canActivate: [permissionGuard],
        data: { anyPermission: LEAVE_ACCESS },
        loadChildren: () =>
          import('./modules/leave/leave.routes').then((m) => m.LEAVE_ROUTES),
      },
      {
        path: 'penalties',
        canActivate: [permissionGuard],
        data: { anyPermission: HR_ACCESS },
        loadChildren: () =>
          import('./modules/penalties/penalties.routes').then((m) => m.PENALTY_ROUTES),
      },
      {
        path: 'custody',
        canActivate: [permissionGuard],
        data: { anyPermission: CUSTODY_ACCESS },
        loadChildren: () =>
          import('./modules/employee-custody/employee-custody.routes').then(
            (m) => m.EMPLOYEE_CUSTODY_ROUTES
          ),
      },
      {
        path: 'payroll',
        canActivate: [permissionGuard],
        data: { anyPermission: PAYROLL_ACCESS },
        loadChildren: () =>
          import('./modules/payroll/payroll.routes').then((m) => m.PAYROLL_ROUTES),
      },
      {
        path: 'job-grades',
        canActivate: [permissionGuard],
        data: { anyPermission: HR_ACCESS },
        loadChildren: () =>
          import('./modules/job-grades/job-grades.routes').then((m) => m.JOB_GRADES_ROUTES),
      },
      {
        path: 'job-positions',
        canActivate: [permissionGuard],
        data: { anyPermission: HR_ACCESS },
        loadChildren: () =>
          import('./modules/job-positions/job-positions.routes').then((m) => m.JOB_POSITIONS_ROUTES),
      },
      {
        path: 'organization-units',
        canActivate: [permissionGuard],
        data: { anyPermission: HR_ACCESS },
        loadChildren: () =>
          import('./modules/organization-units/organization-units.routes').then(
            (m) => m.ORGANIZATION_UNITS_ROUTES
          ),
      },
      {
        path: 'organization-structure',
        canActivate: [permissionGuard],
        data: { anyPermission: HR_ACCESS },
        loadChildren: () =>
          import('./modules/organization-structure/organization-structure.routes').then(
            (m) => m.ORGANIZATION_STRUCTURE_ROUTES
          ),
      },
    ],
  },
  {
    path: '**',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
