import { Routes } from '@angular/router';
import { ErpPermissions } from '../../core/auth/erp-permissions';
import { permissionGuard } from '../../core/guards/permission.guard';

export const ORGANIZATION_UNITS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./organization-unit-list/organization-unit-list.component').then(
        (m) => m.OrganizationUnitListComponent
      ),
  },
  {
    path: 'add',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./organization-unit-form/organization-unit-form.component').then(
        (m) => m.OrganizationUnitFormComponent
      ),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./organization-unit-form/organization-unit-form.component').then(
        (m) => m.OrganizationUnitFormComponent
      ),
  },
];
