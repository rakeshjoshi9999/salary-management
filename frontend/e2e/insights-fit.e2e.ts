import { Page, expect, test } from '@playwright/test';

/**
 * On a desktop the Insights page fits one screen, and the job-title scroll area has a quiet scrollbar
 * (task 8.14, ADR-057). The API is answered in the browser, so these need no backend.
 */

const TITLES = Array.from({ length: 18 }, (_, i) => ({
  jobTitle: `Job title ${i + 1}`,
  department: 'Engineering',
  headcount: 40 + i,
  average: 3_800_000 - i * 150_000,
}));

async function mockApi(page: Page): Promise<void> {
  await page.route('**/api/v1/reference', (route) =>
    route.fulfill({
      json: {
        countries: [{ code: 'IN', name: 'India', currency: 'INR' }],
        departments: [{ name: 'Engineering', jobTitles: ['Job title 1'] }],
      },
    }),
  );
  await page.route('**/api/v1/insights/countries/IN', (route) =>
    route.fulfill({
      json: {
        countryCode: 'IN',
        currency: 'INR',
        salary: { headcount: 3500, min: 400000, max: 4995000, average: 1528176, median: 1109000 },
        averageByJobTitle: TITLES,
        headcountByDepartment: [
          { department: 'Engineering', headcount: 1500 },
          { department: 'Sales', headcount: 1000 },
          { department: 'Finance', headcount: 500 },
          { department: 'Marketing', headcount: 300 },
          { department: 'Operations', headcount: 150 },
          { department: 'Human Resources', headcount: 50 },
        ],
      },
    }),
  );
}

async function open(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/?country=IN');
  await page.getByTestId('tile-titles').getByTestId('title-row').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

const pageOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
  );

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop widths only');
  await mockApi(page);
});

const REM = 16;
/** The page's bottom padding (2.5 rem) plus a few px for the header's height varying. */
const BOTTOM_GAP = 2.5 * REM + 16;

for (const [width, height] of [
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
] as const) {
  test(`fits one screen at ${width}x${height}`, async ({ page }) => {
    await open(page, width, height);

    // No page scroll, and the card fills down to the page padding rather than leaving a gap.
    expect(await pageOverflow(page)).toBeLessThanOrEqual(0);
    const card = (await page.getByTestId('tile-titles').boundingBox())!;
    expect(card.y + card.height).toBeLessThanOrEqual(height);
    expect(card.y + card.height).toBeGreaterThanOrEqual(height - BOTTOM_GAP);
  });
}

test('keeps the job-title card tall enough to read, and its table scrolling', async ({ page }) => {
  await open(page, 1280, 800);

  const tile = page.getByTestId('tile-titles');
  expect((await tile.boundingBox())!.height).toBeGreaterThanOrEqual(18 * REM);
  expect(
    await tile.getByTestId('title-scroll').evaluate((el) => el.scrollHeight > el.clientHeight + 1),
  ).toBe(true);
});

test('lets a short screen scroll the page rather than crushing the card', async ({ page }) => {
  await open(page, 1280, 700);

  const card = (await page.getByTestId('tile-titles').boundingBox())!;

  expect(await pageOverflow(page)).toBeGreaterThan(0);
  expect(card.height).toBeGreaterThanOrEqual(18 * REM - 1);
});

/** "rgb(203, 213, 225) rgba(0, 0, 0, 0)" into [thumb, track] alpha values. */
function alphas(scrollbarColor: string): [number, number] {
  const colours = scrollbarColor.match(/rgba?\([^)]*\)/g) ?? ['', ''];
  const alpha = (c: string) => Number(c.match(/rgba\(.*,\s*([\d.]+)\)/)?.[1] ?? 1);
  return [alpha(colours[0]), alpha(colours[1])];
}

const scrollbar = (page: Page) =>
  page.getByTestId('title-scroll').evaluate((el) => ({
    width: getComputedStyle(el).scrollbarWidth,
    color: getComputedStyle(el).scrollbarColor,
  }));

for (const scheme of ['light', 'dark'] as const) {
  test(`draws a thin scrollbar with a transparent track in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, 1280, 800);

    const style = await scrollbar(page);
    expect(style.width).toBe('thin');
    const [thumb, track] = alphas(style.color);

    expect(track).toBe(0);
    expect(thumb, 'the thumb stays visible').toBeGreaterThan(0);
  });
}

test('changes the scrollbar thumb with the theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await open(page, 1280, 800);
  const light = (await scrollbar(page)).color;

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(async () => (await scrollbar(page)).color).not.toBe(light);
});
