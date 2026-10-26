import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AppTheme = 'light' | 'dark';

export const THEME_KEY = 'technical-office-theme';
export const THEME_LINK_ID = 'app-theme';

const THEME_HREF: Record<AppTheme, string> = {
  light: 'assets/themes/lara-light-blue/theme.css',
  dark: 'assets/themes/lara-dark-green/theme.css',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly theme = signal<AppTheme>(this.readTheme());
  readonly darkTheme = signal(this.theme() === 'dark');

  constructor() {
    this.apply(this.theme());
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    this.darkTheme.set(theme === 'dark');
    this.apply(theme);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(THEME_KEY, theme);
    }
  }

  private apply(theme: AppTheme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;

    const link = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null;
    if (link && !link.href.includes(THEME_HREF[theme])) {
      link.href = THEME_HREF[theme];
    }
  }

  private readTheme(): AppTheme {
    if (!isPlatformBrowser(this.platformId)) {
      return 'light';
    }

    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }
}
