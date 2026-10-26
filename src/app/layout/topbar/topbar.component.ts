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
import { AuthSessionService, LanguageService, ThemeService } from '../../core';

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
  readonly themeService = inject(ThemeService);
  private readonly authSession = inject(AuthSessionService);

  readonly sidebarCollapsed = input<boolean>(false);
  readonly toggleSidebar = output<void>();

  readonly searchQuery = signal('');
  readonly breadcrumbItems = signal<MenuItem[]>([]);
  readonly darkTheme = this.themeService.darkTheme;

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
  }

  private updateBreadcrumb(): void {
    const url = this.router.url;
    const segments = url.split('/').filter(Boolean);
    const items: MenuItem[] = [];
    let path = '';
    for (const segment of segments) {
      path += `/${segment}`;
      if (path === '/dashboard') {
        continue;
      }
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
    if (pathSoFar.startsWith('/admin/') || pathSoFar === '/admin') {
      const adminKey = `breadcrumb.admin_${segment}`;
      const adminTranslated = this.translate.instant(adminKey);
      if (adminTranslated !== adminKey) {
        return adminTranslated;
      }
    }
    const key = `breadcrumb.${segment}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  onProfile(): void {
    void this.router.navigateByUrl('/profile');
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
    this.authSession.logout();
  }
}
