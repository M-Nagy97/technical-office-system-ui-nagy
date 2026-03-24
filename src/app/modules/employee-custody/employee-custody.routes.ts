import { Routes } from '@angular/router';

export const EMPLOYEE_CUSTODY_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'financial' },
  {
    path: 'financial',
    loadComponent: () =>
      import('./financial-custody/financial-custody.component').then((m) => m.FinancialCustodyComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./documents-custody/documents-custody-list.component').then(
        (m) => m.DocumentsCustodyListComponent
      ),
  },
  {
    path: 'documents/:id',
    loadComponent: () =>
      import('./document-custody-detail/document-custody-detail.component').then(
        (m) => m.DocumentCustodyDetailComponent
      ),
  },
];
