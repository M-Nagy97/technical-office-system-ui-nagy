import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'users',
    loadChildren: () => import('./users/users.routes').then((m) => m.USERS_ROUTES),
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('./roles/roles-management.component').then((m) => m.RolesManagementComponent),
  },
  {
    path: 'modules',
    loadComponent: () =>
      import('./modules/modules-management.component').then((m) => m.ModulesManagementComponent),
  },
  {
    path: 'permissions',
    loadComponent: () =>
      import('./permissions/permissions-management.component').then(
        (m) => m.PermissionsManagementComponent,
      ),
  },
  {
    path: 'pages',
    loadComponent: () =>
      import('./pages/pages-management.component').then((m) => m.PagesManagementComponent),
  },
];
