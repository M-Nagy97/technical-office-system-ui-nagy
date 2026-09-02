import { HttpInterceptorFn } from '@angular/common/http';

const LANG_KEY = 'technical-office-lang';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  // Read directly from storage to prevent circular DI with HttpClient -> TranslateService -> LanguageService
  let currentLang = 'ar';
  if (typeof window !== 'undefined' && window.localStorage) {
    currentLang = localStorage.getItem(LANG_KEY) || 'ar';
  }

  const localizedReq = req.clone({
    setHeaders: {
      'Accept-Language': currentLang === 'ar' ? 'ar-SA,ar;q=0.9,en;q=0.8' : 'en-US,en;q=0.9,ar;q=0.8',
    },
  });

  return next(localizedReq);
};
