import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TooltipModule } from 'primeng/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { NavItem } from '../../core/models/nav-item.model';

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
        { label: 'nav.schedules', icon: 'pi pi-calendar-plus', route: '/attendance/schedules', module: 'attendance' },
        { label: 'nav.month_plans', icon: 'pi pi-calendar', route: '/attendance/month-plans', module: 'attendance' },
        { label: 'nav.time_attendance_settings', icon: 'pi pi-cog', route: '/attendance/settings', module: 'attendance' },
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
