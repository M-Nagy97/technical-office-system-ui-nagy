import { Routes } from '@angular/router';

export const JOB_POSITIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./job-position-list/job-position-list.component').then((m) => m.JobPositionListComponent),
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./job-position-form/job-position-form.component').then((m) => m.JobPositionFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./job-position-form/job-position-form.component').then((m) => m.JobPositionFormComponent),
  },
];
