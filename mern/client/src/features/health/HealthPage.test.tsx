import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '../../test/server';
import { renderWithQuery } from '../../test/render';
import { HealthPage } from './HealthPage';

const up = () => HttpResponse.json({ status: 'UP' });

/** The health page: one query, and each of its states shown the way a user would see it. */
describe('HealthPage', () => {
  it('7. shows a loading status while the health check is pending', async () => {
    server.use(
      http.get('/api/health', async () => {
        await delay('infinite');
      }),
    );

    renderWithQuery(<HealthPage />);

    expect(await screen.findByRole('status')).toHaveTextContent(/checking/i);
  });

  it('8. shows that the server is up when it answers UP', async () => {
    server.use(http.get('/api/health', up));

    renderWithQuery(<HealthPage />);

    expect(await screen.findByText(/the server is up/i)).toBeInTheDocument();
  });

  it('9. shows that the server is down, as a state rather than an error, when it answers 503', async () => {
    server.use(
      http.get('/api/health', () => HttpResponse.json({ status: 'DOWN' }, { status: 503 })),
    );

    renderWithQuery(<HealthPage />);

    expect(await screen.findByText(/the server is down/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('10. shows an error with a retry when the server is unreachable, and retrying recovers', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderWithQuery(<HealthPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);

    server.use(http.get('/api/health', up));
    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText(/the server is up/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
