import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { provideTranslateService, provideTranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';

// PrimeNG 17: theme is loaded in styles (main.scss). For PrimeNG 18+ use providePrimeNG({ theme: { preset: Aura }, ripple: true }).

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
    provideTranslateHttpLoader({ prefix: 'assets/i18n/', suffix: '.json' }),
    ...provideTranslateService({
      loader: provideTranslateLoader(TranslateHttpLoader),
      lang: 'ar',
      fallbackLang: 'en',
    }),
    MessageService,
    ConfirmationService,
  ],
};
