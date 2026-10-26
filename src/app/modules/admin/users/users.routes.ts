import { Routes } from '@angular/router';
import { ErpPermissions } from '../../../core/auth/erp-permissions';
import { permissionGuard } from '../../../core/guards/permission.guard';

export const USERS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  {
    path: 'list',
    loadComponent: () =>
      import('./user-list.component').then((m) => m.UserListComponent),
  },
  {
    path: 'create',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.userWrite },
    loadComponent: () =>
      import('./user-create.component').then((m) => m.UserCreateComponent),
  },
  {
    path: 'edit/:id',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.userWrite },
    loadComponent: () =>
      import('./user-edit.component').then((m) => m.UserEditComponent),
  },
  {
    path: 'my-profile',
    loadComponent: () =>
      import('./my-profile.component').then((m) => m.MyProfileComponent),
  },
];
