import { expect, test } from '@playwright/test';

/**
 * Theme, type and motion (task 8.8, ADR-054). Runs at desktop and phone width against the seeded local
 * stack, like the catalog paths.
 */

const THEME_KEY = 'salary-management.theme';
const DARK_CANVAS = 'rgb(2, 6, 23)'; // slate-950

test('remembers the theme across a reload', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByTestId('theme-toggle');

  // System, then Light, then Dark.
  await toggle.click();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', /^Theme: Dark\./);
  await page.reload();

  await expect(page.locator('html')).toHaveClass(/\bapp-dark\b/);
  await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-label', /^Theme: Dark\./);
});

test('applies a stored dark theme before the app starts', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'dark');
    // The app's scripts come after <body>; record the class the moment <body> is parsed.
    new MutationObserver((records, observer) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeName === 'BODY') {
            (window as unknown as { darkAtBody: boolean }).darkAtBody =
              document.documentElement.classList.contains('app-dark');
            observer.disconnect();
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  }, THEME_KEY);

  await page.goto('/');

  expect(await page.evaluate(() => (window as unknown as { darkAtBody: boolean }).darkAtBody)).toBe(
    true,
  );
});

test('follows the emulated colour scheme on system', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  await page.goto('/');

  await expect(page.locator('html')).toHaveClass(/\bapp-dark\b/);
  await expect(page.locator('body')).toHaveCSS('background-color', DARK_CANVAS);
});

test('uses Inter with tabular figures for amounts', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('stat-headcount').waitFor();

  // fonts.check() is true when no face of that name exists at all, so look for a loaded face.
  const interLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].some(
      (face) => face.family.replace(/"/g, '') === 'Inter Variable' && face.status === 'loaded',
    );
  });
  expect(interLoaded).toBe(true);
  await expect(page.locator('body')).toHaveCSS('font-family', /^"Inter Variable"/);
  await expect(page.getByTestId('stat-median').locator('dd')).toHaveCSS(
    'font-variant-numeric',
    'tabular-nums',
  );
});

test('turns transitions off for reduced motion', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByTestId('theme-toggle');
  await expect(toggle).not.toHaveCSS('transition-duration', '0s');

  await page.emulateMedia({ reducedMotion: 'reduce' });

  await expect(toggle).toHaveCSS('transition-duration', '0s');
});
