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
        path: 'penalties',
        loadChildren: () =>
          import('./modules/penalties/penalties.routes').then((m) => m.PENALTY_ROUTES),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./core/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
