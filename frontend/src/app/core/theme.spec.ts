import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  DARK_CLASS,
  MATCH_MEDIA,
  THEME_STORAGE,
  THEME_STORAGE_KEY,
  ThemeMode,
  ThemeService,
} from './theme';

/** Light, dark or following the OS, remembered per browser (ADR-054). */
describe('ThemeService', () => {
  class FakeStorage {
    readonly values = new Map<string, string>();
    getItem(key: string): string | null {
      return this.values.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
      this.values.set(key, value);
    }
  }

  class ThrowingStorage {
    getItem(): string | null {
      throw new Error('blocked');
    }
    setItem(): void {
      throw new Error('blocked');
    }
  }

  /** prefers-color-scheme: dark, which a test can flip as if the OS setting changed. */
  function fakeOs(dark: boolean) {
    const listeners: ((event: { matches: boolean }) => void)[] = [];
    const query = {
      matches: dark,
      addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) =>
        listeners.push(listener),
      removeEventListener: () => undefined,
    };
    return {
      matchMedia: () => query as unknown as MediaQueryList,
      setDark(value: boolean) {
        query.matches = value;
        listeners.forEach((listener) => listener({ matches: value }));
      },
    };
  }

  let storage: Pick<Storage, 'getItem' | 'setItem'>;
  let os: ReturnType<typeof fakeOs>;

  function create(): ThemeService {
    TestBed.configureTestingModule({
      providers: [
        { provide: THEME_STORAGE, useValue: storage },
        { provide: MATCH_MEDIA, useValue: os.matchMedia },
      ],
    });
    return TestBed.inject(ThemeService);
  }

  const isDark = () => TestBed.inject(DOCUMENT).documentElement.classList.contains(DARK_CLASS);

  beforeEach(() => {
    storage = new FakeStorage();
    os = fakeOs(false);
  });

  afterEach(() => document.documentElement.classList.remove(DARK_CLASS));

  it('defaults to system when nothing is stored', () => {
    const theme = create();

    expect(theme.mode()).toBe('system');
  });

  it('restores the stored choice', () => {
    (storage as FakeStorage).values.set(THEME_STORAGE_KEY, 'dark');

    const theme = create();

    expect(theme.mode()).toBe('dark');
  });

  it('treats an unknown stored value as system', () => {
    (storage as FakeStorage).values.set(THEME_STORAGE_KEY, 'purple');

    const theme = create();

    expect(theme.mode()).toBe('system');
  });

  it('falls back to system when storage throws, and still changes mode for this visit', () => {
    storage = new ThrowingStorage();

    const theme = create();
    expect(theme.mode()).toBe('system');

    theme.cycle();

    expect(theme.mode()).toBe('light');
  });

  it('cycles system, then light, then dark, then system', () => {
    const theme = create();
    const seen: ThemeMode[] = [];

    for (let i = 0; i < 3; i++) {
      theme.cycle();
      seen.push(theme.mode());
    }

    expect(seen).toEqual(['light', 'dark', 'system']);
  });

  it('saves each choice under one key', () => {
    const theme = create();

    theme.cycle();
    theme.cycle();

    expect([...(storage as FakeStorage).values.entries()]).toEqual([[THEME_STORAGE_KEY, 'dark']]);
  });

  it('applies the dark class for dark and removes it for light', () => {
    (storage as FakeStorage).values.set(THEME_STORAGE_KEY, 'light');
    const theme = create();
    TestBed.tick();
    expect(isDark()).toBe(false);

    theme.cycle();
    TestBed.tick();
    expect(isDark()).toBe(true);

    theme.cycle(); // system, and the OS is light
    TestBed.tick();
    expect(isDark()).toBe(false);
  });

  it('follows the operating system on system, including when it changes', () => {
    os = fakeOs(true);
    create();
    TestBed.tick();
    expect(isDark()).toBe(true);

    os.setDark(false);
    TestBed.tick();

    expect(isDark()).toBe(false);
  });

  it('ignores operating system changes on an explicit choice', () => {
    (storage as FakeStorage).values.set(THEME_STORAGE_KEY, 'dark');
    os = fakeOs(true);
    create();
    TestBed.tick();

    os.setDark(false);
    TestBed.tick();

    expect(isDark()).toBe(true);
  });

  describe('browser defaults', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('treats a missing matchMedia as a light OS', () => {
      // As in jsdom and some old browsers; stubbed so a test-setup polyfill cannot hide the fallback.
      vi.stubGlobal('matchMedia', undefined);
      const matchMedia = TestBed.inject(MATCH_MEDIA);

      const query = matchMedia('(prefers-color-scheme: dark)');

      expect(query.matches).toBe(false);
      expect(() => query.addEventListener('change', () => undefined)).not.toThrow();
    });

    it('keeps the choice in memory when localStorage is unreachable', () => {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
        throw new DOMException('Blocked', 'SecurityError');
      });

      const fallback = TestBed.inject(THEME_STORAGE);
      fallback.setItem(THEME_STORAGE_KEY, 'dark');

      expect(fallback.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
  });
});
