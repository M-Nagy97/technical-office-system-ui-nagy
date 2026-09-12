import { Routes } from '@angular/router';

export const LEAVE_ROUTES: Routes = [
  // Leave Types
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
    loadComponent: () =>
      import('./types/add-leave-type/add-leave-type.component').then(
        (m) => m.AddLeaveTypeComponent
      ),
  },

  // Leave Requests
  {
    path: 'requests',
    loadComponent: () =>
      import('./requests/leave-requests-list/leave-requests-list.component').then(
        (m) => m.LeaveRequestsListComponent
      ),
  },
  {
    path: 'requests/new',
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

  // Permission Requests
  {
    path: 'permissions',
    loadComponent: () =>
      import('./permissions/permission-requests-list/permission-requests-list.component').then(
        (m) => m.PermissionRequestsListComponent
      ),
  },
  {
    path: 'permissions/new',
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

  // Leave Balance
  {
    path: 'balance',
    loadComponent: () =>
      import('./balances/leave-balance/leave-balance.component').then(
        (m) => m.LeaveBalanceComponent
      ),
  },

  // Policy Rules
  {
    path: 'policy-rules',
    loadComponent: () =>
      import('./policy/policy-rules/policy-rules.component').then(
        (m) => m.PolicyRulesComponent
      ),
  },
  // Backward-compatible alias
  {
    path: 'rules',
    redirectTo: 'policy-rules',
    pathMatch: 'full',
  },
];
