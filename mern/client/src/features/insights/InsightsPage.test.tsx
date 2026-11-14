import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from '../../app/routes';
import { signedInAs } from '../../test/auth';
import { GERMANY, INDIA, insightsBody, insightsFor, REFERENCE } from '../../test/insights';
import { problem } from '../../test/problem';
import { currentUrl, renderRoutes } from '../../test/render';
import { server } from '../../test/server';

/** The figure shown in the stat tile named `label`. */
const tile = (label: RegExp) => within(screen.getByRole('group', { name: label }));

/** The Insights dashboard: the home page, per country, in local currency (ADR-M6). */
describe('InsightsPage', () => {
  beforeEach(() => {
    server.use(...signedInAs('VIEWER'), insightsFor('IN', INDIA));
  });

  it('M5-21. insightsIsTheHomePage: a signed-in user lands on the dashboard for India', async () => {
    renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { name: /insights/i })).toBeInTheDocument();
    // The options arrive with the reference data, possibly after the select itself.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /country/i })).toHaveValue('IN'),
    );
  });

  it('M5-22. showsStatTilesInLocalCurrency: min, max, average and median in rupees', async () => {
    renderRoutes(routes, '/');

    await screen.findByText('₹1,333,082.00');
    expect(tile(/median/i).getByText('₹1,333,082.00')).toBeInTheDocument();
    expect(tile(/average/i).getByText('₹1,427,738.35')).toBeInTheDocument();
    expect(tile(/minimum/i).getByText('₹786,119.00')).toBeInTheDocument();
    expect(tile(/maximum/i).getByText('₹2,684,905.00')).toBeInTheDocument();
    expect(tile(/employees/i).getByText('3,011')).toBeInTheDocument();
  });

  it('M5-23. showsRankedBarsByJobTitleAndDepartment: the lists keep the order the API sends', async () => {
    renderRoutes(routes, '/');

    await screen.findByText('₹2,240,000.00');
    const titles = screen.getByRole('list', { name: /average salary by job title/i });
    expect(
      within(titles)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringMatching(/Engineering Manager.*₹2,240,000\.00/),
      expect.stringMatching(/Software Engineer.*₹1,400,000\.00/),
      expect.stringMatching(/Recruiter.*₹1,010,000\.00/),
    ]);
    // Bars, not just text: the top value fills the track.
    const topBar = within(titles)
      .getAllByRole('listitem')[0]!
      .querySelector<HTMLElement>('[data-bar]');
    expect(topBar?.style.width).toBe('100%');
    const departments = screen.getByRole('list', { name: /headcount by department/i });
    expect(
      within(departments)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([expect.stringMatching(/Engineering.*900/), expect.stringMatching(/Sales.*610/)]);
  });

  it('M5-24. countryOptionsComeFromReference: every supported country, with its currency', async () => {
    renderRoutes(routes, '/');

    const select = await screen.findByRole('combobox', { name: /country/i });
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'France (EUR)',
      'Germany (EUR)',
      'India (INR)',
      'United Kingdom (GBP)',
      'United States (USD)',
    ]);
  });

  it('M5-25. switchingCountryUpdatesUrlAndFigures: choosing Germany shows euros and says so in the URL', async () => {
    server.use(insightsFor('DE', GERMANY));
    const { router } = renderRoutes(routes, '/');
    const user = userEvent.setup();

    await screen.findByRole('option', { name: /germany/i });
    await user.selectOptions(screen.getByRole('combobox', { name: /country/i }), 'DE');

    expect(await screen.findByText('€61,882.00')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/?country=DE');
  });

  it('M5-26. keepsPreviousFiguresDimmedWhileSwitching: India stays, marked busy, until Germany arrives', async () => {
    let openGate = () => {};
    const gate = new Promise<void>((resolve) => (openGate = resolve));
    server.use(
      http.get('/api/insights/countries/DE', async () => {
        await gate;
        return HttpResponse.json(GERMANY);
      }),
    );
    renderRoutes(routes, '/');
    const user = userEvent.setup();
    await screen.findByText('₹1,333,082.00');
    await screen.findByRole('option', { name: /germany/i });

    try {
      await user.selectOptions(screen.getByRole('combobox', { name: /country/i }), 'DE');

      const figures = screen.getByRole('region', { name: /figures/i });
      await waitFor(() => expect(figures).toHaveAttribute('aria-busy', 'true'));
      expect(within(figures).getByText('₹1,333,082.00')).toBeInTheDocument();
      openGate();
      expect(await screen.findByText('€61,882.00')).toBeInTheDocument();
      await waitFor(() => expect(figures).toHaveAttribute('aria-busy', 'false'));
    } finally {
      openGate(); // never leave the held response pending into the next test
    }
  });

  it('M5-27. unknownCountryFallsBackToIndia: a bad code in the URL is corrected', async () => {
    const requested: string[] = [];
    server.events.on('request:start', ({ request }) => {
      requested.push(new URL(request.url).pathname);
    });
    const { router } = renderRoutes(routes, '/?country=XX');

    expect(await screen.findByText('₹1,333,082.00')).toBeInTheDocument();
    expect(currentUrl(router)).toBe('/?country=IN');
    // Replaced, not pushed: Back must not return to the bad code and bounce forward again.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(requested).not.toContain('/api/insights/countries/XX');
    server.events.removeAllListeners();
  });

  it('M5-28. emptyCountryShowsEmptyState: a country with nobody in it says so', async () => {
    server.use(insightsFor('DE', insightsBody('DE')));

    renderRoutes(routes, '/?country=DE');

    expect(await screen.findByText(/no employees in germany yet/i)).toBeInTheDocument();
  });

  // Added after the step 3 implementation review: a failed reference load left a shared link
  // (/?country=DE) on "Loading insights…" forever, with no error and no way to retry.
  it('M5-29b. referenceErrorShowsRetry: a failed country list says so and recovers on retry', async () => {
    server.use(
      http.get('/api/reference', () => problem(500, 'INTERNAL_ERROR')),
      insightsFor('DE', GERMANY),
    );
    renderRoutes(routes, '/?country=DE');
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load the country list/i);
    server.use(http.get('/api/reference', () => HttpResponse.json(REFERENCE)));
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('€61,882.00')).toBeInTheDocument();
  });

  it('M5-29. insightsErrorShowsRetry: a failed load explains itself and recovers on retry', async () => {
    server.use(http.get('/api/insights/countries/IN', () => problem(500, 'INTERNAL_ERROR')));
    renderRoutes(routes, '/');
    const user = userEvent.setup();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load insights/i);
    server.use(insightsFor('IN', INDIA));
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('₹1,333,082.00')).toBeInTheDocument();
  });
});
