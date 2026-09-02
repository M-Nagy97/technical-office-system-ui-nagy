import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

export type AppLang = 'ar' | 'en';

const LANG_KEY = 'technical-office-lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentLang = signal<AppLang>(this.getStoredLang());
  readonly isRtl = signal<boolean>(this.currentLang() === 'ar');
  readonly dir = signal<'rtl' | 'ltr'>(this.currentLang() === 'ar' ? 'rtl' : 'ltr');

  constructor() {
    this.translate.use(this.currentLang());
    if (isPlatformBrowser(this.platformId)) {
      this.applyDocumentDir(this.currentLang());
      this.translate.onLangChange.subscribe((e) => {
        const lang = e.lang as AppLang;
        this.currentLang.set(lang);
        this.isRtl.set(lang === 'ar');
        this.dir.set(lang === 'ar' ? 'rtl' : 'ltr');
        this.applyDocumentDir(lang);
      });
    }
  }

  setLanguage(lang: AppLang): void {
    this.currentLang.set(lang);
    this.isRtl.set(lang === 'ar');
    this.dir.set(lang === 'ar' ? 'rtl' : 'ltr');
    this.translate.use(lang);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(LANG_KEY, lang);
      this.applyDocumentDir(lang);
    }
  }

  toggleLanguage(): void {
    this.setLanguage(this.currentLang() === 'ar' ? 'en' : 'ar');
  }

  private getStoredLang(): AppLang {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(LANG_KEY) as AppLang | null;
      if (stored === 'ar' || stored === 'en') return stored;
    }
    return 'ar';
  }

  private applyDocumentDir(lang: AppLang): void {
    if (typeof document === 'undefined') return;
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const langAttr = lang === 'ar' ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', langAttr);
    document.body.setAttribute('dir', dir);
  }
}
