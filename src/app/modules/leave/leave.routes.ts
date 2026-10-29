import { Routes } from '@angular/router';
import { ErpPermissions } from '../../core/auth/erp-permissions';
import { permissionGuard } from '../../core/guards/permission.guard';

export const LEAVE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./types/leave-list/leave-list.component').then((m) => m.LeaveListComponent),
  },
  {
    path: 'types',
    loadComponent: () =>
      import('./types/leave-list/leave-list.component').then((m) => m.LeaveListComponent),
  },
  {
    path: 'types/add',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.leaveWrite },
    loadComponent: () =>
      import('./types/add-leave-type/add-leave-type.component').then(
        (m) => m.AddLeaveTypeComponent
      ),
  },
  {
    path: 'permission-types',
    loadComponent: () =>
      import('./permission-types/permission-type-list/permission-type-list.component').then(
        (m) => m.PermissionTypeListComponent
      ),
  },
  {
    path: 'permission-types/add',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.leaveWrite },
    loadComponent: () =>
      import('./permission-types/add-permission-type/add-permission-type.component').then(
        (m) => m.AddPermissionTypeComponent
      ),
  },

  {
    path: 'requests',
    loadComponent: () =>
      import('./requests/leave-requests-list/leave-requests-list.component').then(
        (m) => m.LeaveRequestsListComponent
      ),
  },
  {
    path: 'requests/new',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.leaveWrite },
    loadComponent: () =>
      import('./requests/leave-request-form/leave-request-form.component').then(
        (m) => m.LeaveRequestFormComponent
      ),
  },
  {
    path: 'requests/:id',
    loadComponent: () =>
      import('./requests/leave-request-detail/leave-request-detail.component').then(
        (m) => m.LeaveRequestDetailComponent
      ),
  },

  {
    path: 'permissions',
    loadComponent: () =>
      import('./permissions/permission-requests-list/permission-requests-list.component').then(
        (m) => m.PermissionRequestsListComponent
      ),
  },
  {
    path: 'permissions/new',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.leaveWrite },
    loadComponent: () =>
      import('./permissions/permission-request-form/permission-request-form.component').then(
        (m) => m.PermissionRequestFormComponent
      ),
  },
  {
    path: 'permissions/:id',
    loadComponent: () =>
      import('./permissions/permission-request-detail/permission-request-detail.component').then(
        (m) => m.PermissionRequestDetailComponent
      ),
  },

  {
    path: 'balance',
    loadComponent: () =>
      import('./balances/leave-balance/leave-balance.component').then(
        (m) => m.LeaveBalanceComponent
      ),
  },

  {
    path: 'policy-rules',
    loadComponent: () =>
      import('./policy/policy-rules/policy-rules.component').then(
        (m) => m.PolicyRulesComponent
      ),
  },
  {
    path: 'rules',
    redirectTo: 'policy-rules',
    pathMatch: 'full',
  },
];
