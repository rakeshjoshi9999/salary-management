import { Locator, Page, expect, test } from '@playwright/test';

/**
 * The two happy paths from the approved list (task 7.7). The database is seeded with the `seed`
 * profile, whose emails are `first.last.NNNNN@acme.example` (ADR-049). Seeded names repeat, so path 1
 * asks the API for the employee whose email contains `00042@`, then searches by their name as a user
 * would and opens that employee's row.
 */

const API = 'http://localhost:8081/api/v1';

/** The visible result for an employee: a table row on desktop, a card on phones. */
function results(page: Page): Locator {
  return page.locator('[data-testid^="row-"]:visible, [data-testid^="card-"]:visible');
}

async function search(page: Page, text: string): Promise<void> {
  await page.getByTestId('search-input').fill(text);
  // 300 ms debounce, then the URL and the list follow. Compare the decoded value: the router
  // leaves characters such as @ unencoded.
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(text);
}

test('find and update a salary', async ({ page }, testInfo) => {
  const newSalary = testInfo.project.name === 'phone' ? '123456.78' : '234567.89';
  const formatted = testInfo.project.name === 'phone' ? '123,456.78' : '234,567.89';

  const lookup = await page.request.get(`${API}/employees`, { params: { q: '00042@' } });
  const { items } = (await lookup.json()) as { items: { fullName: string; email: string }[] };
  expect(items).toHaveLength(1);
  const { fullName, email } = items[0];

  await page.goto('/catalog');
  await search(page, fullName);
  const target = results(page).filter({ hasText: fullName }).first();
  await expect(target).toBeVisible();
  // On phones the card shows no email, so open it and check the drawer is the right person.
  await target.click();
  await expect(page).toHaveURL(/\/catalog\/\d+/);
  await page.getByTestId('employee-details').waitFor();
  if (!(await page.getByTestId('employee-details').textContent())?.includes(email)) {
    // Same name, different person: go straight to the right one by searching the email.
    await page.getByTestId('drawer-close').click();
    await search(page, email);
    await results(page).first().click();
  }
  await expect(page.getByTestId('employee-details')).toContainText(email);
  await page.getByTestId('edit-button').click();

  await page.getByTestId('field-salary').fill(newSalary);
  await page.getByTestId('save').click();

  await expect(page.getByText('Saved')).toBeVisible();
  await expect(page.getByTestId('employee-details')).toContainText(formatted);
  await page.getByTestId('drawer-close').click();
  await expect(results(page).filter({ hasText: formatted })).toHaveCount(1);
});

test('add then delete an employee', async ({ page }, testInfo) => {
  const email = `e2e.${testInfo.project.name}.${Date.now()}@acme.example`;

  await page.goto('/catalog');
  await page.getByTestId('add-employee').click();
  await expect(page).toHaveURL(/\/catalog\/new/);

  await page.getByTestId('field-fullName').fill('Playwright Tester');
  await page.getByTestId('field-email').fill(email);
  await page.getByTestId('field-department').selectOption('Engineering');
  await page.getByTestId('field-jobTitle').selectOption({ index: 1 });
  await page.getByTestId('field-countryCode').selectOption('DE');
  await page.getByTestId('field-salary').fill('65000');
  await page.getByTestId('field-hireDate').fill('2024-02-01');
  await page.getByTestId('save').click();

  await expect(page).toHaveURL(/\/catalog\/\d+/);
  await expect(page.getByTestId('employee-details')).toContainText('Playwright Tester');
  await expect(page.getByTestId('employee-details')).toContainText('EUR 65,000.00');

  await page.getByTestId('drawer-close').click();
  await search(page, email);
  await expect(results(page)).toHaveCount(1);

  await results(page).first().click();
  await page.getByTestId('delete-button').click();
  // The confirm dialog's own Delete, not the drawer's.
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByText('Deleted', { exact: true })).toBeVisible();
  await expect(page.getByTestId('no-matches')).toBeVisible();
  await expect(results(page)).toHaveCount(0);
});
