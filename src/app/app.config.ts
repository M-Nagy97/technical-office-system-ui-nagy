import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { languageInterceptor } from './core/interceptors/language.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { I18nPluralPipe } from '@angular/common';

import { provideTranslateService, provideTranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import {
  DateAdapter,
  CalendarUtils,
  CalendarEventTitleFormatter,
  CalendarDateFormatter,
  CalendarA11y,
} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

import { environment } from '../environments/environment';
import { ACCESS_TOKEN_KEY } from './core/auth/auth.constants';
import { BASE_PATH } from './core/api/generated/variables';
import { Configuration } from './core/api/generated/configuration';
import { BASE_PATH as IDENTITY_BASE_PATH } from './core/api/identity-generated/variables';
import { Configuration as IdentityConfiguration } from './core/api/identity-generated/configuration';

// PrimeNG 17: Lara green themes are swapped by ThemeService (#app-theme). For PrimeNG 18+ use providePrimeNG({ theme: { preset: Aura }, ripple: true }).

function readAccessToken(): string {
  if (typeof localStorage === 'undefined') {
    return '';
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';
}

export const appConfig: ApplicationConfig = {
  providers: [
    I18nPluralPipe,
    { provide: DateAdapter, useFactory: adapterFactory },
    { provide: BASE_PATH, useValue: environment.apiBaseUrl },
    {
      provide: Configuration,
      useFactory: () =>
        new Configuration({
          basePath: environment.apiBaseUrl,
          accessToken: readAccessToken,
        }),
    },
    { provide: IDENTITY_BASE_PATH, useValue: environment.identityApiUrl },
    {
      provide: IdentityConfiguration,
      useFactory: () =>
        new IdentityConfiguration({
          basePath: environment.identityApiUrl,
          accessToken: readAccessToken,
        }),
    },
    CalendarUtils,
    CalendarEventTitleFormatter,
    CalendarDateFormatter,
    CalendarA11y,
    provideRouter(routes, withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, languageInterceptor, errorInterceptor]),
    ),
    provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
    ...provideTranslateService({
      loader: provideTranslateLoader(TranslateHttpLoader),
      lang: environment.defaultLang,
      fallbackLang: 'en',
    }),
    MessageService,
    ConfirmationService,
  ],
};
