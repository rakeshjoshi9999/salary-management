import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { API_INTERCEPTORS } from './core/api-interceptors';
import { DARK_CLASS } from './core/theme';
import { AppPreset } from './core/theme-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // fetch rather than XHR: no zone.js patching involved, which suits a
    // zoneless application.
    provideHttpClient(withFetch(), withInterceptors(API_INTERCEPTORS)),
    MessageService,
    providePrimeNG({
      theme: {
        preset: AppPreset,
        options: {
          // Dark follows the class ThemeService (and index.html, before boot) puts on <html>, not
          // PrimeNG's default of the OS setting, so the toggle switches components too (ADR-054).
          darkModeSelector: `.${DARK_CLASS}`,
          // Tailwind emits `@layer theme, base, components, utilities`.
          // Naming primeng here and placing it after base means Tailwind's
          // utilities layer still wins, so a utility class can override a
          // PrimeNG component style. Without this the two fight by source order.
          cssLayer: {
            name: 'primeng',
            order: 'theme, base, primeng',
          },
        },
      },
    }),
  ],
};
