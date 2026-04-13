import { Routes } from '@angular/router';

export const PAYROLL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./payroll-hub/payroll-hub.component').then((m) => m.PayrollHubComponent),
  },
  {
    path: 'periods',
    loadComponent: () =>
      import('./payroll-placeholder/payroll-placeholder.component').then(
        (m) => m.PayrollPlaceholderComponent
      ),
    data: {
      titleKey: 'payroll.periods.title',
      descriptionKey: 'payroll.periods.description',
    },
  },
  {
    path: 'salary-structures',
    loadComponent: () =>
      import('./payroll-placeholder/payroll-placeholder.component').then(
        (m) => m.PayrollPlaceholderComponent
      ),
    data: {
      titleKey: 'payroll.salary_structures.title',
      descriptionKey: 'payroll.salary_structures.description',
    },
  },
  {
    path: 'lookups',
    loadComponent: () =>
      import('./payroll-placeholder/payroll-placeholder.component').then(
        (m) => m.PayrollPlaceholderComponent
      ),
    data: {
      titleKey: 'payroll.lookups.title',
      descriptionKey: 'payroll.lookups.description',
    },
  },
  {
    path: 'runs',
    loadComponent: () =>
      import('./payroll-placeholder/payroll-placeholder.component').then(
        (m) => m.PayrollPlaceholderComponent
      ),
    data: {
      titleKey: 'payroll.runs.title',
      descriptionKey: 'payroll.runs.description',
    },
  },
  {
    path: 'payslips',
    loadComponent: () =>
      import('./payroll-placeholder/payroll-placeholder.component').then(
        (m) => m.PayrollPlaceholderComponent
      ),
    data: {
      titleKey: 'payroll.payslips.title',
      descriptionKey: 'payroll.payslips.description',
    },
  },
];
