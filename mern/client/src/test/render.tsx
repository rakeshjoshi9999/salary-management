import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';

/** A fresh cache per test, and no retries: a failing query should fail now, not three attempts later. */
function testQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Renders one component with the providers the app gives it, outside any router. */
export function renderWithQuery(ui: ReactElement) {
  return render(<QueryClientProvider client={testQueryClient()}>{ui}</QueryClientProvider>);
}

/** Renders the app's route table at a URL, in memory, as `main.tsx` does in the browser. */
export function renderRoutes(routes: RouteObject[], url = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
