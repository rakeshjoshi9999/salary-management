import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  InjectionToken,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Also read by the inline script in index.html, which applies the theme before Angular starts. */
export const THEME_STORAGE_KEY = 'salary-management.theme';
export const DARK_CLASS = 'app-dark';

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Blocked site data makes even reading `window.localStorage` throw; the choice then lasts for this visit. */
function browserStorage(): ThemeStorage {
  try {
    return localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
    };
  }
}

export const THEME_STORAGE = new InjectionToken<ThemeStorage>('THEME_STORAGE', {
  providedIn: 'root',
  factory: browserStorage,
});

/** Without matchMedia (jsdom, some old browsers) the OS counts as light and never changes. */
const LIGHT_OS = {
  matches: false,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
} as unknown as MediaQueryList;

export const MATCH_MEDIA = new InjectionToken<(query: string) => MediaQueryList>('MATCH_MEDIA', {
  providedIn: 'root',
  factory: () => (query: string) =>
    typeof window.matchMedia === 'function' ? window.matchMedia(query) : LIGHT_OS,
});

const NEXT: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };

function isMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Light, dark, or following the OS, remembered per browser (ADR-054). The dark class on `<html>`
 * switches PrimeNG (darkModeSelector) and the app's colour tokens (styles.css) together. Storage that
 * throws (blocked site data) falls back to System and the choice lasts for this visit only.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage = inject(THEME_STORAGE);
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly osQuery = inject(MATCH_MEDIA)('(prefers-color-scheme: dark)');
  private readonly osDark = signal(this.osQuery.matches);
  private readonly current = signal<ThemeMode>(this.read());

  readonly mode = this.current.asReadonly();
  readonly nextMode = computed(() => NEXT[this.current()]);
  /** Whether the page is dark now, for what CSS cannot reach (the doughnut's canvas). */
  readonly dark = computed(
    () => this.current() === 'dark' || (this.current() === 'system' && this.osDark()),
  );

  constructor() {
    const onOsChange = (event: { matches: boolean }) => this.osDark.set(event.matches);
    this.osQuery.addEventListener('change', onOsChange);
    inject(DestroyRef).onDestroy(() => this.osQuery.removeEventListener('change', onOsChange));

    effect(() => this.root.classList.toggle(DARK_CLASS, this.dark()));
  }

  cycle(): void {
    const next = NEXT[this.current()];
    this.current.set(next);
    try {
      this.storage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Blocked storage: the choice holds for this visit.
    }
  }

  private read(): ThemeMode {
    try {
      const stored = this.storage.getItem(THEME_STORAGE_KEY);
      return isMode(stored) ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
