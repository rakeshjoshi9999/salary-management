import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { Routes, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { API_INTERCEPTORS } from '../api-interceptors';
import { MATCH_MEDIA, THEME_STORAGE } from '../theme';

/**
 * What the app shell needs in a test: a router, the app's interceptors over a fake HTTP backend,
 * PrimeNG's toast and confirm services, and a theme with nothing stored on a light OS (jsdom has no
 * matchMedia). Shared by every spec that creates App, so their setups cannot drift apart.
 */
export function provideShellTesting(routes: Routes = []): (Provider | EnvironmentProviders)[] {
  const stored = new Map<string, string>();
  return [
    provideRouter(routes),
    provideHttpClient(withInterceptors(API_INTERCEPTORS)),
    provideHttpClientTesting(),
    MessageService,
    ConfirmationService,
    {
      provide: THEME_STORAGE,
      useValue: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
    },
    {
      provide: MATCH_MEDIA,
      useValue: () => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    },
  ];
}
