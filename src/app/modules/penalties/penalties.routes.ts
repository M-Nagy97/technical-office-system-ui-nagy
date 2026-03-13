import { Routes } from '@angular/router';

export const PENALTY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./penalty-list/penalty-list.component').then((m) => m.PenaltyListComponent),
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./add-penalty/add-penalty.component').then((m) => m.AddPenaltyComponent),
  },
];
