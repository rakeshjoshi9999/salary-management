# Smoke test of the live app

Task 8.4, 2026-10-26, against **production** (https://salary-management-ivory-psi.vercel.app), as a
reviewer would use it (ADR-053). Run with a throwaway Playwright script, not committed, at desktop width
(1280 px) and phone width (390 px). The script is reproduced at the end so it can be run again.

## Read-only checks: 9 of 9 passed

No data changed. Every row ran at both widths unless it says otherwise.

| Area | What was checked | Result |
|---|---|---|
| Insights | Headcount card, title bars and the doughnut legend render for the default country; switching to Germany puts `?country=DE` in the URL and shows euros | Passed |
| Catalog | The list shows "of 10,000"; searching `patel` updates `?q=` and the results; a country, department and salary sort from a link; hire-date sort by header (desktop); page 2 shows "21–40"; a link with `?country=XX&size=37` shows "Part of the link was ignored" and is replaced with `/catalog` | Passed |
| Drawer | Opening a row shows the details; Edit fills the form; Cancel returns to the view; `/catalog/99999999` shows "This employee no longer exists" | Passed |
| Settings | The country dropdown loads; Save is disabled until something changes | Passed |
| Health page | `/health` shows "API reachable, database connected" and the environment `production` | Passed |
| Phone menu | The menu opens, Settings navigates, and the menu closes (phone only) | Passed |

**Seen along the way:** on a phone the drawer slides in, so a screenshot taken the instant it opens catches
it part-way; settled, it fills the screen. Not a defect.

## Writing pass

_Pending: runs only with the engineer's yes at the time (ADR-053)._

## The script

Save as `frontend/e2e/zz-smoke.e2e.ts` with this config as `frontend/zz-smoke.config.ts`, then run
`npx playwright test -c zz-smoke.config.ts` from `frontend/`. It changes no data.

```ts
import base from './playwright.config';
// Temporary, not committed: the read-only smoke test against production (task 8.4).
export default {
  ...base,
  testMatch: '**/zz-smoke.e2e.ts',
  retries: 0,
  timeout: 180_000,
  webServer: undefined,
  use: { ...base.use, baseURL: 'https://salary-management-ivory-psi.vercel.app' },
};
```

```ts
import { Page, expect, test } from '@playwright/test';

const out = 'test-results/smoke';
const results = (page: Page) =>
  page.locator('[data-testid^="row-"]:visible, [data-testid^="card-"]:visible');
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `${out}/${test.info().project.name}-${name}.png` });

test.describe.configure({ mode: 'serial' });

test('insights', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('stat-headcount')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('legend-row')).not.toHaveCount(0);
  await expect(page.getByTestId('title-row')).not.toHaveCount(0);
  await shot(page, '01-insights');
  await page.getByTestId('insights-country').selectOption('DE');
  await expect(page).toHaveURL(/\?country=DE/);
  await expect(page.getByTestId('stat-median')).toContainText('EUR');
});

test('catalog search, filter, sort, page and a bad link', async ({ page }) => {
  await page.goto('/catalog');
  await expect(results(page).first()).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('range-text')).toContainText('of 10,000');
  await page.getByTestId('search-input').fill('patel');
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('patel');
  await expect(results(page).first()).toContainText(/patel/i);
  await page.goto('/catalog?country=IN&department=Engineering&sort=salary,desc');
  await expect(results(page).first()).toContainText('IN');
  await shot(page, '02-catalog-filtered');
  if (test.info().project.name === 'desktop') {
    await page.getByTestId('sort-hireDate').click();
    await expect(page).toHaveURL(/sort=hireDate,asc/);
  }
  await page.goto('/catalog?page=1');
  await expect(page.getByTestId('range-text')).toContainText('21–40');
  await page.goto('/catalog?country=XX&size=37');
  await expect(page.getByText('Part of the link was ignored')).toBeVisible();
  await expect(page).toHaveURL(/\/catalog$/);
});

test('drawer: view, edit then cancel, and a missing employee', async ({ page }) => {
  await page.goto('/catalog');
  await results(page).first().click({ timeout: 120_000 });
  await expect(page.getByTestId('employee-details')).toBeVisible();
  await page.waitForTimeout(1000);
  await shot(page, '03-drawer');
  await page.getByTestId('edit-button').click();
  await expect(page.getByTestId('field-salary')).not.toHaveValue('');
  await page.getByTestId('cancel').click();
  await expect(page.getByTestId('employee-details')).toBeVisible();
  await page.goto('/catalog/99999999');
  await expect(page.getByTestId('not-found')).toContainText('no longer exists');
});

test('settings and health, read only', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByTestId('settings-country')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('settings-save')).toBeDisabled();
  await page.goto('/health');
  await expect(page.getByTestId('health-reachable')).toBeVisible({ timeout: 120_000 });
  await expect(page.getByTestId('health-environment')).toHaveText('production');
});

test('phone menu', async ({ page }) => {
  test.skip(test.info().project.name !== 'phone');
  await page.goto('/catalog');
  await page.getByTestId('menu-button').click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByTestId('mobile-menu')).toHaveCount(0);
});
```
