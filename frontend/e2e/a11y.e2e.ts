import AxeBuilder from '@axe-core/playwright';
import { Page, expect, test } from '@playwright/test';

/**
 * Automated accessibility checks, colour contrast included, on every screen in light and dark, at
 * desktop and phone width (task 8.8, ADR-054). The look itself is judged by eye on stage.
 */

const SCHEMES = ['light', 'dark'] as const;

async function expectNoViolations(page: Page, scheme: (typeof SCHEMES)[number]): Promise<void> {
  // A dark run on a page that stayed light would check nothing about dark mode.
  if (scheme === 'dark') {
    await expect(page.locator('html')).toHaveClass(/\bapp-dark\b/);
  } else {
    await expect(page.locator('html')).not.toHaveClass(/\bapp-dark\b/);
  }
  // Contrast measured mid-fade is flaky: let entrances (drawer slide, skeletons) finish first.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  // Ids and targets only, so a failure says what to fix without a wall of HTML.
  const found = results.violations.map((v) => ({
    id: v.id,
    targets: v.nodes.map((node) => node.target.join(' ')),
  }));
  expect(found).toEqual([]);
}

for (const scheme of SCHEMES) {
  test.describe(`${scheme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    });

    test('has no axe violations on Insights', async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('stat-headcount').waitFor();

      await expectNoViolations(page, scheme);
    });

    test('has no axe violations on Catalog with the drawer open', async ({ page }) => {
      await page.goto('/catalog');
      await page
        .locator('[data-testid^="row-"]:visible, [data-testid^="card-"]:visible')
        .first()
        .click();
      await page.getByTestId('employee-details').waitFor();

      await expectNoViolations(page, scheme);
    });

    test('has no axe violations on Settings', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByTestId('settings-country')).toBeEnabled();

      await expectNoViolations(page, scheme);
    });
  });
}

test('never scrolls sideways at phone width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone width only');

  for (const [path, ready] of [
    ['/', 'stat-headcount'],
    ['/catalog', 'catalog-results'],
    ['/settings', 'settings-country'],
  ] as const) {
    await page.goto(path);
    await page.getByTestId(ready).waitFor();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBe(0);
  }
});
