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
      import('./payroll-periods/payroll-periods.component').then((m) => m.PayrollPeriodsComponent),
  },
  {
    path: 'salary-structures',
    loadComponent: () =>
      import('./payroll-salary-structures/payroll-salary-structures.component').then(
        (m) => m.PayrollSalaryStructuresComponent
      ),
  },
  {
    path: 'lookups',
    loadComponent: () =>
      import('./payroll-lookups/payroll-lookups.component').then((m) => m.PayrollLookupsComponent),
  },
  {
    path: 'runs',
    loadComponent: () =>
      import('./payroll-runs/payroll-runs.component').then((m) => m.PayrollRunsComponent),
  },
  {
    path: 'payslips',
    loadComponent: () =>
      import('./payroll-payslips/payroll-payslips.component').then((m) => m.PayrollPayslipsComponent),
  },
];
