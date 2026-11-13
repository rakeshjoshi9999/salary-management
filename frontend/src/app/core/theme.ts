import { Injectable, InjectionToken, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'salary-management.theme';
export const DARK_CLASS = 'app-dark';

export const THEME_STORAGE = new InjectionToken<Pick<Storage, 'getItem' | 'setItem'>>(
  'THEME_STORAGE',
  { providedIn: 'root', factory: () => localStorage },
);

export const MATCH_MEDIA = new InjectionToken<(query: string) => MediaQueryList>('MATCH_MEDIA', {
  providedIn: 'root',
  factory: () => (query: string) => window.matchMedia(query),
});

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>('light').asReadonly();
  readonly nextMode = signal<ThemeMode>('light').asReadonly();

  cycle(): void {
    // Not implemented yet.
  }
}
