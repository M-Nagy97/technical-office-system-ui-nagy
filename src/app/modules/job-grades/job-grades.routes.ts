import { Routes } from '@angular/router';

export const JOB_GRADES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./job-grade-list/job-grade-list.component').then((m) => m.JobGradeListComponent),
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./job-grade-form/job-grade-form.component').then((m) => m.JobGradeFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./job-grade-form/job-grade-form.component').then((m) => m.JobGradeFormComponent),
  },
];
