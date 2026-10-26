import { Routes } from '@angular/router';
import { ErpPermissions } from '../../core/auth/erp-permissions';
import { permissionGuard } from '../../core/guards/permission.guard';

export const PENALTY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./penalty-list/penalty-list.component').then((m) => m.PenaltyListComponent),
  },
  {
    path: 'add',
    canActivate: [permissionGuard],
    data: { permission: ErpPermissions.hrWrite },
    loadComponent: () =>
      import('./add-penalty/add-penalty.component').then((m) => m.AddPenaltyComponent),
  },
];
