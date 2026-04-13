import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-payroll-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, CardModule, ButtonModule],
  templateUrl: './payroll-hub.component.html',
  styleUrl: './payroll-hub.component.scss',
})
export class PayrollHubComponent {
  readonly tiles = [
    {
      route: '/payroll/periods',
      titleKey: 'payroll.periods.title',
      descKey: 'payroll.periods.card_hint',
      icon: 'pi pi-calendar',
    },
    {
      route: '/payroll/salary-structures',
      titleKey: 'payroll.salary_structures.title',
      descKey: 'payroll.salary_structures.card_hint',
      icon: 'pi pi-money-bill',
    },
    {
      route: '/payroll/lookups',
      titleKey: 'payroll.lookups.title',
      descKey: 'payroll.lookups.card_hint',
      icon: 'pi pi-list',
    },
    {
      route: '/payroll/runs',
      titleKey: 'payroll.runs.title',
      descKey: 'payroll.runs.card_hint',
      icon: 'pi pi-calculator',
    },
    {
      route: '/payroll/payslips',
      titleKey: 'payroll.payslips.title',
      descKey: 'payroll.payslips.card_hint',
      icon: 'pi pi-file-pdf',
    },
  ] as const;
}
