import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TooltipModule } from 'primeng/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NavItem } from '../../core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TooltipModule, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  private readonly router = inject(Router);

  readonly collapsed = input<boolean>(false);
  readonly toggleSidebar = output<void>();

  readonly expandedModules = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.expandActiveModule();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.expandActiveModule());
  }

  private expandActiveModule(): void {
    for (const item of this.navItems) {
      if (item.children?.length && this.hasActiveChild(item)) {
        this.expandedModules.update((set) => new Set(set).add(item.module));
        break;
      }
    }
  }

  readonly navItems: NavItem[] = [
    {
      label: 'nav.dashboard',
      icon: 'pi pi-home',
      route: '/dashboard',
      module: 'dashboard',
    },
    // الموظفين — معاملات + ترميزات
    {
      label: 'nav.employees_module',
      icon: 'pi pi-users',
      module: 'employees',
      children: [
        { label: 'nav.transactions', icon: 'pi pi-list', section: true, module: 'employees' },
        { label: 'nav.employee_list', icon: 'pi pi-list', route: '/employees', module: 'employees' },
        { label: 'nav.add_employee', icon: 'pi pi-user-plus', route: '/employees/add', module: 'employees' },
        { label: 'nav.appointment_documents', icon: 'pi pi-file', route: '/employees/documents', module: 'employees' },
        { label: 'nav.lookups', icon: 'pi pi-cog', section: true, module: 'employees' },
        { label: 'nav.job_grades_module', icon: 'pi pi-briefcase', route: '/job-grades', module: 'employees' },
        { label: 'nav.job_positions_module', icon: 'pi pi-sitemap', route: '/job-positions', module: 'employees' },
        { label: 'nav.organization_units_module', icon: 'pi pi-building', route: '/organization-units', module: 'employees' },
        {
          label: 'nav.organization_structure',
          icon: 'pi pi-share-alt',
          route: '/organization-structure',
          module: 'employees',
        },
      ],
    },
    // الإجازات والأذونات
    {
      label: 'nav.leave_module',
      icon: 'pi pi-sun',
      module: 'leave',
      children: [
        { label: 'nav.transactions', icon: 'pi pi-list', section: true, module: 'leave' },
        { label: 'nav.leave_requests', icon: 'pi pi-calendar-plus', route: '/leave/requests', module: 'leave' },
        { label: 'nav.permission_requests', icon: 'pi pi-clock', route: '/leave/permissions', module: 'leave' },
        { label: 'nav.leave_balance', icon: 'pi pi-chart-pie', route: '/leave/balance', module: 'leave' },
        { label: 'nav.lookups', icon: 'pi pi-cog', section: true, module: 'leave' },
        { label: 'nav.leave_types_list', icon: 'pi pi-list', route: '/leave/types', module: 'leave' },
        { label: 'nav.add_leave_type', icon: 'pi pi-plus', route: '/leave/types/add', module: 'leave' },
        { label: 'nav.policy_rules', icon: 'pi pi-sliders-h', route: '/leave/rules', module: 'leave' },
      ],
    },
    // الحضور والانصراف — معاملات + ترميزات
    {
      label: 'nav.attendance_module',
      icon: 'pi pi-calendar',
      module: 'attendance',
      children: [
        { label: 'nav.transactions', icon: 'pi pi-list', section: true, module: 'attendance' },
        { label: 'nav.daily_attendance', icon: 'pi pi-clock', route: '/attendance', module: 'attendance' },
        { label: 'nav.attendance_reports', icon: 'pi pi-chart-bar', route: '/attendance/reports', module: 'attendance' },
        { label: 'nav.lookups', icon: 'pi pi-cog', section: true, module: 'attendance' },
        { label: 'nav.shifts', icon: 'pi pi-moon', route: '/attendance/shifts', module: 'attendance' },
        { label: 'nav.month_plans', icon: 'pi pi-calendar', route: '/attendance/plans', module: 'attendance' },
        { label: 'nav.month_plan_template', icon: 'pi pi-calendar-plus', route: '/attendance/month-plan-template', module: 'attendance' },
        { label: 'nav.employee_plans', icon: 'pi pi-users', route: '/attendance/employee-plans', module: 'attendance' },
        { label: 'nav.employee_schedule', icon: 'pi pi-calendar', route: '/attendance/employee-schedule', module: 'attendance' },
        { label: 'nav.employee_attendance', icon: 'pi pi-table', route: '/attendance/employee-attendance', module: 'attendance' },
        { label: 'nav.calculation_workbench', icon: 'pi pi-sliders-h', route: '/attendance/calculation-workbench', module: 'attendance' },
        { label: 'nav.calculation_runs', icon: 'pi pi-history', route: '/attendance/calculation-runs', module: 'attendance' },
        { label: 'nav.fingerprint_devices', icon: 'pi pi-desktop', section: true, module: 'attendance' },
        { label: 'nav.attendance_devices', icon: 'pi pi-desktop', route: '/attendance/devices', module: 'attendance' },
        { label: 'nav.employee_enroll_links', icon: 'pi pi-id-card', route: '/attendance/employee-enroll-links', module: 'attendance' },
        { label: 'nav.time_attendance_settings', icon: 'pi pi-cog', route: '/attendance/settings', module: 'attendance' },
      ],
    },
    // العهدة — أموال ومستندات
    {
      label: 'nav.custody_module',
      icon: 'pi pi-briefcase',
      module: 'custody',
      children: [
        { label: 'nav.transactions', icon: 'pi pi-list', section: true, module: 'custody' },
        { label: 'nav.custody_financial', icon: 'pi pi-wallet', route: '/custody/financial', module: 'custody' },
        { label: 'nav.custody_documents', icon: 'pi pi-folder', route: '/custody/documents', module: 'custody' },
      ],
    },
    // الرواتب
    {
      label: 'nav.payroll_module',
      icon: 'pi pi-percentage',
      module: 'payroll',
      children: [
        { label: 'nav.transactions', icon: 'pi pi-list', section: true, module: 'payroll' },
        { label: 'nav.payroll_overview', icon: 'pi pi-th-large', route: '/payroll', module: 'payroll' },
        { label: 'nav.payroll_periods', icon: 'pi pi-calendar', route: '/payroll/periods', module: 'payroll' },
        { label: 'nav.payroll_salary_structures', icon: 'pi pi-money-bill', route: '/payroll/salary-structures', module: 'payroll' },
        { label: 'nav.payroll_lookups', icon: 'pi pi-list', route: '/payroll/lookups', module: 'payroll' },
        { label: 'nav.payroll_runs', icon: 'pi pi-calculator', route: '/payroll/runs', module: 'payroll' },
        { label: 'nav.payroll_payslips', icon: 'pi pi-file-pdf', route: '/payroll/payslips', module: 'payroll' },
      ],
    },
    // الجزاءات — معاملات + ترميزات
    {
      label: 'nav.penalties_module',
      icon: 'pi pi-exclamation-triangle',
      module: 'penalties',
      children: [
        { label: 'nav.transactions', icon: 'pi pi-list', section: true, module: 'penalties' },
        { label: 'nav.penalty_list', icon: 'pi pi-list', route: '/penalties', module: 'penalties' },
        { label: 'nav.add_penalty', icon: 'pi pi-plus', route: '/penalties/add', module: 'penalties' },
        { label: 'nav.lookups', icon: 'pi pi-cog', section: true, module: 'penalties' },
      ],
    },
  ];

  isModuleExpanded(module: string): boolean {
    return this.expandedModules().has(module);
  }

  toggleModule(module: string): void {
    this.expandedModules.update((set) => {
      const next = new Set(set);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  isRouteActive(route: string | undefined): boolean {
    if (!route) return false;
    if (route === '/dashboard') return this.router.url === '/dashboard' || this.router.url === '/';
    return this.router.url.startsWith(route);
  }

  hasActiveChild(item: NavItem): boolean {
    if (!item.children?.length) return false;
    return item.children.some((c: NavItem) => c.route && this.isRouteActive(c.route));
  }
}
