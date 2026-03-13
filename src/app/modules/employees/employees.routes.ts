import { Routes } from '@angular/router';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./employee-list/employee-list.component').then((m) => m.EmployeeListComponent),
  },
  {
    path: 'add',
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
    loadComponent: () =>
      import('./employee-form/employee-form.component').then((m) => m.EmployeeFormComponent),
  },
];
