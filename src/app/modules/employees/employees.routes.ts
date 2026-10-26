import { Routes } from '@angular/router';
import { ErpPermissions } from '../../core/auth/erp-permissions';
import { permissionGuard } from '../../core/guards/permission.guard';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./employee-list/employee-list.component').then((m) => m.EmployeeListComponent),
  },
  {
    path: 'add',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./employee-form/employee-form.component').then((m) => m.EmployeeFormComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./appointment-documents/appointment-documents.component').then(
        (m) => m.AppointmentDocumentsComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./employee-detail/employee-detail.component').then((m) => m.EmployeeDetailComponent),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./employee-form/employee-form.component').then((m) => m.EmployeeFormComponent),
  },
];
