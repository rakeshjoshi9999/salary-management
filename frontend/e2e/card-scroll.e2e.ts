import { Locator, Page, expect, test } from '@playwright/test';

/**
 * Long cards stop at the screen and scroll inside from 640 px; phones keep one page scroll; the page
 * stays still behind the open drawer (task 8.13, ADR-056).
 */

const desktopOnly = (name: string) => test.skip(name !== 'desktop', 'Tablet and desktop only');

async function viewportHeight(page: Page): Promise<number> {
  return page.evaluate(() => window.innerHeight);
}

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  expect(rect, 'element is laid out').not.toBeNull();
  return rect!;
}

/** The Catalog's scrolling rows: the PrimeNG table's own scroll container. */
const rowsArea = (page: Page) =>
  page.getByTestId('catalog-card').locator('.p-datatable-table-container');

async function scrolls(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return (
      el.scrollHeight > el.clientHeight + 1 &&
      (style.overflowY === 'auto' || style.overflowY === 'scroll')
    );
  });
}

test('fits the Catalog card to the screen', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto('/catalog?size=100');
  await page.locator('[data-testid^="row-"]').first().waitFor();

  const card = await box(page.getByTestId('catalog-card'));

  expect(card.y + card.height).toBeLessThanOrEqual(await viewportHeight(page));
  expect(await scrolls(rowsArea(page))).toBe(true);
});

test('keeps the toolbar, header and pager in view while rows scroll', async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto('/catalog?size=100');
  await page.locator('[data-testid^="row-"]').first().waitFor();

  await rowsArea(page).evaluate((el) => el.scrollTo({ top: el.scrollHeight }));

  const card = await box(page.getByTestId('catalog-card'));
  for (const [name, locator] of [
    ['search', page.getByTestId('search-input')],
    ['column header', page.getByTestId('sort-fullName')],
    ['paginator', page.getByTestId('catalog-card').locator('p-paginator')],
  ] as const) {
    const part = await box(locator);
    expect(part.y, `${name} below the card top`).toBeGreaterThanOrEqual(card.y - 1);
    expect(part.y + part.height, `${name} above the card bottom`).toBeLessThanOrEqual(
      card.y + card.height + 1,
    );
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('fits the job-title card to the screen', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto('/?country=IN');
  const tile = page.getByTestId('tile-titles');
  await tile.getByTestId('title-row').first().waitFor();

  expect((await box(tile)).height).toBeLessThanOrEqual(await viewportHeight(page));
  const list = tile.getByTestId('title-scroll');
  expect(await scrolls(list)).toBe(true);

  const headingBefore = await box(tile.locator('h3'));
  await list.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  expect((await box(tile.locator('h3'))).y).toBe(headingBefore.y);
});

test('fits the Catalog card to the screen on a tablet', async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);
  // ADR-056 says from 640 px, so a tablet width must cap too, not only the desktop one.
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/catalog?size=100');
  await page.locator('[data-testid^="row-"]').first().waitFor();

  const card = await box(page.getByTestId('catalog-card'));

  expect(card.y + card.height).toBeLessThanOrEqual(1024);
  expect(await scrolls(rowsArea(page))).toBe(true);
});

test('keeps normal page scrolling on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone only');
  await page.goto('/catalog?size=50');
  await page.locator('[data-testid^="card-"]').first().waitFor();

  // Fifty cards run far past the screen: uncapped, the card is taller than the viewport.
  const card = await box(page.getByTestId('catalog-card'));
  expect(card.height).toBeGreaterThan(await viewportHeight(page));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight > document.documentElement.clientHeight,
    ),
  ).toBe(true);
});

test('holds the page and the list still behind the open drawer', async ({ page }, testInfo) => {
  await page.goto('/catalog?size=100');
  await page
    .locator('[data-testid^="row-"]:visible, [data-testid^="card-"]:visible')
    .first()
    .click();
  await page.getByTestId('employee-details').waitFor();

  // The lock itself: on desktop the capped page has nothing to scroll, so scrollY alone proves nothing.
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');

  const desktop = testInfo.project.name === 'desktop';
  const rowsBefore = desktop ? await rowsArea(page).evaluate((el) => el.scrollTop) : 0;
  const pageBefore = await page.evaluate(() => window.scrollY);

  // Over the list, left of the drawer; on phones the drawer covers the screen.
  await page.mouse.move(100, 400);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(300);

  expect(await page.evaluate(() => window.scrollY)).toBe(pageBefore);
  if (desktop) {
    expect(await rowsArea(page).evaluate((el) => el.scrollTop)).toBe(rowsBefore);
  }
});
