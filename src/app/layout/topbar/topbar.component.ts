import {
  Component,
  input,
  output,
  signal,
  inject,
  OnInit,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { LanguageService } from '../../core/services/language.service';

const THEME_KEY = 'technical-office-theme';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    BreadcrumbModule,
    InputTextModule,
    MenuModule,
    BadgeModule,
    AvatarModule,
    TooltipModule,
    TranslatePipe,
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  readonly sidebarCollapsed = input<boolean>(false);
  readonly toggleSidebar = output<void>();

  readonly searchQuery = signal('');
  readonly breadcrumbItems = signal<MenuItem[]>([]);
  readonly darkTheme = signal(this.readTheme() === 'dark');

  readonly userMenuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    this.updateUserMenu();
    this.updateBreadcrumb();
    this.translate.onLangChange.subscribe(() => {
      this.updateBreadcrumb();
      this.updateUserMenu();
    });
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.updateBreadcrumb());
    // Apply saved theme on init
    const theme = this.readTheme();
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  private updateBreadcrumb(): void {
    const url = this.router.url;
    const segments = url.split('/').filter(Boolean);
    const homeLabel = this.translate.instant('topbar.home');
    const items: MenuItem[] = [{ label: homeLabel, icon: 'pi pi-home', routerLink: '/dashboard' }];
    let path = '';
    for (const segment of segments) {
      path += `/${segment}`;
      const label = this.formatSegment(segment, path);
      items.push({ label, routerLink: path });
    }
    this.breadcrumbItems.set(items);
  }

  private formatSegment(segment: string, pathSoFar: string): string {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
      const detailKey = 'breadcrumb.detail';
      const detail = this.translate.instant(detailKey);
      return detail !== detailKey ? detail : 'Detail';
    }
    if (segment === 'documents' && pathSoFar === '/custody/documents') {
      const key = 'breadcrumb.custody_documents';
      const translated = this.translate.instant(key);
      return translated !== key ? translated : segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    const key = `breadcrumb.${segment}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  toggleTheme(): void {
    this.darkTheme.update((v) => !v);
    const theme = this.darkTheme() ? 'dark' : 'light';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_KEY, theme);
    }
  }

  private readTheme(): 'light' | 'dark' {
    if (typeof localStorage === 'undefined') return 'light';
    const stored = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
    return stored === 'dark' ? 'dark' : 'light';
  }

  onProfile(): void {
    // TODO: navigate to profile
  }

  onSettings(): void {
    // TODO: navigate to settings
  }

  private updateUserMenu(): void {
    this.userMenuItems.set([
      { label: this.translate.instant('topbar.profile'), icon: 'pi pi-user', command: () => this.onProfile() },
      { label: this.translate.instant('topbar.settings'), icon: 'pi pi-cog', command: () => this.onSettings() },
      { separator: true },
      { label: this.translate.instant('topbar.logout'), icon: 'pi pi-sign-out', command: () => this.onLogout() },
    ]);
  }

  onLogout(): void {
    // TODO: implement logout
  }
}
