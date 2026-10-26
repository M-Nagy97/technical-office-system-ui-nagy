import { Routes } from '@angular/router';
import { ErpPermissions } from '../../core/auth/erp-permissions';
import { permissionGuard } from '../../core/guards/permission.guard';

export const JOB_POSITIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./job-position-list/job-position-list.component').then((m) => m.JobPositionListComponent),
  },
  {
    path: 'add',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./job-position-form/job-position-form.component').then((m) => m.JobPositionFormComponent),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./job-position-form/job-position-form.component').then((m) => m.JobPositionFormComponent),
  },
];
