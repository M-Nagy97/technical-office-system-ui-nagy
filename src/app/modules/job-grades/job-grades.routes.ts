import { Routes } from '@angular/router';
import { ErpPermissions } from '../../core/auth/erp-permissions';
import { permissionGuard } from '../../core/guards/permission.guard';

export const JOB_GRADES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./job-grade-list/job-grade-list.component').then((m) => m.JobGradeListComponent),
  },
  {
    path: 'add',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./job-grade-form/job-grade-form.component').then((m) => m.JobGradeFormComponent),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./job-grade-form/job-grade-form.component').then((m) => m.JobGradeFormComponent),
  },
];
