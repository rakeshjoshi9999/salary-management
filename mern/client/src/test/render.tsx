import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { StrictMode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';

/** A fresh cache per test, and no retries: a failing query should fail now, not three attempts later. */
function testQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

/** Renders one component with the providers the app gives it, outside any router. */
export function renderWithQuery(ui: ReactElement) {
  return render(<QueryClientProvider client={testQueryClient()}>{ui}</QueryClientProvider>);
}

/**
 * Renders the app's route table at a URL, in memory, as `main.tsx` does in the browser. Returns the router
 * (to read `router.state.location`) and the query cache (to check it was cleared). `strict` wraps it in
 * `<StrictMode>`, which mounts, unmounts and mounts again, running effects twice, as in development.
 */
export function renderRoutes(routes: RouteObject[], url = '/', { strict = false } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const queryClient = testQueryClient();
  const tree = (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return { ...render(strict ? <StrictMode>{tree}</StrictMode> : tree), router, queryClient };
}

/** Where the router is now, as one string: `/login?from=%2F`. */
export function currentUrl(router: { state: { location: { pathname: string; search: string } } }) {
  return router.state.location.pathname + router.state.location.search;
}
