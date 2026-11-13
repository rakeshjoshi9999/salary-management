import { Locator, expect, test } from '@playwright/test';

/**
 * Money stays in full on one line in every bento tile (task 8.9, ADR-054), even for the longest amount
 * the API allows (`Money` in openapi.yaml, NUMERIC(14,2)). The insights response is replaced, so the
 * values do not depend on the seed.
 */

const LONGEST = 999999999999.99;
const SHOWN = '999,999,999,999.99';

/** The narrowest tile of each layout: just above each breakpoint, and the two standard sizes. */
const WIDTHS = { desktop: [1280, 1024, 768], phone: [390] } as const;

async function fitOf(value: Locator, tile: Locator) {
  const box = await tile.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      left: rect.left + parseFloat(style.paddingLeft),
      right: rect.right - parseFloat(style.paddingRight),
    };
  });
  return value.evaluate((el, content) => {
    // One line box per line: count the distinct tops of the text's rects.
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0);
    const tops = new Set(rects.map((rect) => Math.round(rect.top)));
    const left = Math.min(...rects.map((rect) => rect.left));
    const right = Math.max(...rects.map((rect) => rect.right));
    return {
      lines: tops.size,
      // 1 px for sub-pixel rounding.
      insideTile: left >= content.left - 1 && right <= content.right + 1,
    };
  }, box);
}

test('fits the longest amounts on one line in every tile', async ({ page }, testInfo) => {
  await page.route('**/api/v1/insights/countries/IN', (route) =>
    route.fulfill({
      json: {
        countryCode: 'IN',
        currency: 'INR',
        salary: { headcount: 3500, min: LONGEST, max: LONGEST, average: LONGEST, median: LONGEST },
        averageByJobTitle: [
          {
            jobTitle: 'Engineering Manager',
            department: 'Engineering',
            headcount: 40,
            average: LONGEST,
          },
        ],
        headcountByDepartment: [{ department: 'Engineering', headcount: 3500 }],
      },
    }),
  );

  for (const width of WIDTHS[testInfo.project.name as keyof typeof WIDTHS]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?country=IN');
    await page.getByTestId('stat-median').waitFor();
    // Measure Inter, not the fallback font it replaces.
    await page.evaluate(() => document.fonts.ready);

    const amounts = [
      ...['stat-median', 'stat-average', 'stat-min', 'stat-max'].map((id) => ({
        id,
        tile: page.getByTestId(id),
        value: page.getByTestId(id).locator('dd').first(),
      })),
      {
        id: 'title-amount',
        tile: page.getByTestId('title-row').first(),
        value: page.getByTestId('title-amount').first(),
      },
    ];
    for (const { id, tile, value } of amounts) {
      await expect(value).toContainText(SHOWN);
      expect(await fitOf(value, tile), `${id} at ${width}px`).toEqual({
        lines: 1,
        insideTile: true,
      });
    }
  }
});
