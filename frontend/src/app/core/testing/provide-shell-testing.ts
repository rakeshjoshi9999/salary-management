import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { Routes, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { API_INTERCEPTORS } from '../api-interceptors';

/**
 * What the app shell needs in a test: a router, the app's interceptors over a fake HTTP backend, and
 * PrimeNG's toast service. Shared by every spec that creates App, so their setups cannot drift apart.
 */
export function provideShellTesting(routes: Routes = []): (Provider | EnvironmentProviders)[] {
  return [
    provideRouter(routes),
    provideHttpClient(withInterceptors(API_INTERCEPTORS)),
    provideHttpClientTesting(),
    MessageService,
  ];
}
