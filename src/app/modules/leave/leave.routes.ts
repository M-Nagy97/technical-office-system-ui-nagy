import { Routes } from '@angular/router';

export const LEAVE_ROUTES: Routes = [
  // Leave Types (existing)
  {
    path: '',
    loadComponent: () =>
      import('./leave-list/leave-list.component').then((m) => m.LeaveListComponent),
  },
  {
    path: 'types',
    loadComponent: () =>
      import('./leave-list/leave-list.component').then((m) => m.LeaveListComponent),
  },
  {
    path: 'types/add',
    loadComponent: () =>
      import('./add-leave-type/add-leave-type.component').then(
        (m) => m.AddLeaveTypeComponent
      ),
  },

  // Leave Requests
  {
    path: 'requests',
    loadComponent: () =>
      import('./leave-requests-list/leave-requests-list.component').then(
        (m) => m.LeaveRequestsListComponent
      ),
  },
  {
    path: 'requests/new',
    loadComponent: () =>
      import('./leave-request-form/leave-request-form.component').then(
        (m) => m.LeaveRequestFormComponent
      ),
  },
  {
    path: 'requests/:id',
    loadComponent: () =>
      import('./leave-request-detail/leave-request-detail.component').then(
        (m) => m.LeaveRequestDetailComponent
      ),
  },

  // Permission Requests
  {
    path: 'permissions',
    loadComponent: () =>
      import('./permission-requests-list/permission-requests-list.component').then(
        (m) => m.PermissionRequestsListComponent
      ),
  },
  {
    path: 'permissions/new',
    loadComponent: () =>
      import('./permission-request-form/permission-request-form.component').then(
        (m) => m.PermissionRequestFormComponent
      ),
  },
  {
    path: 'permissions/:id',
    loadComponent: () =>
      import('./permission-request-detail/permission-request-detail.component').then(
        (m) => m.PermissionRequestDetailComponent
      ),
  },

  // Leave Balance
  {
    path: 'balance',
    loadComponent: () =>
      import('./leave-balance/leave-balance.component').then(
        (m) => m.LeaveBalanceComponent
      ),
  },
];
