import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { server } from '../test/server';
import { renderRoutes } from '../test/render';
import { routes } from './routes';

/** The route table inside the app shell, rendered at a URL as the browser would. */
describe('the app routes', () => {
  beforeEach(() => {
    server.use(http.get('/api/health', () => HttpResponse.json({ status: 'UP' })));
  });

  it('11. renders the shell, with its header and navigation, around the current route', async () => {
    renderRoutes(routes, '/health');

    expect(within(screen.getByRole('banner')).getByText(/salary management/i)).toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: /health/i })).toHaveAttribute('href', '/health');
    const main = screen.getByRole('main');
    expect(
      await within(main).findByRole('heading', { name: /server health/i }),
    ).toBeInTheDocument();
  });

  it('12. shows the health page at the root URL', async () => {
    renderRoutes(routes, '/');

    expect(await screen.findByRole('heading', { name: /server health/i })).toBeInTheDocument();
  });

  it('13. shows a not-found page with a link home for an unknown URL', async () => {
    renderRoutes(routes, '/nope');

    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
  });
});
