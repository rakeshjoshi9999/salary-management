import { useQuery } from '@tanstack/react-query';

import { api, ApiError } from '../../lib/api';

export type Health = 'UP' | 'DOWN';

/**
 * A 503 is the server's answer "I am running but my database is not", so it is data, not a failure:
 * only an unreachable server is an error.
 */
export async function fetchHealth(): Promise<Health> {
  try {
    await api<{ status: 'UP' }>('/health');
    return 'UP';
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      return 'DOWN';
    }
    throw error;
  }
}

/** The server's health; the page offers its own Retry, so failures are not retried behind the user's back. */
export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: fetchHealth, retry: false });
}
