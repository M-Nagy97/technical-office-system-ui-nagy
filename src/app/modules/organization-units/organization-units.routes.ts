import { Routes } from '@angular/router';

export const ORGANIZATION_UNITS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./organization-unit-list/organization-unit-list.component').then(
        (m) => m.OrganizationUnitListComponent
      ),
  },
  {
    path: 'add',
    loadComponent: () =>
      import('./organization-unit-form/organization-unit-form.component').then(
        (m) => m.OrganizationUnitFormComponent
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./organization-unit-form/organization-unit-form.component').then(
        (m) => m.OrganizationUnitFormComponent
      ),
  },
];
