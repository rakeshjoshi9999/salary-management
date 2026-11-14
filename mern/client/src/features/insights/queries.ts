import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '../../lib/api';

export interface Reference {
  countries: { code: string; name: string; currency: string }[];
  departments: { name: string; jobTitles: string[] }[];
}

export interface CountryInsights {
  countryCode: string;
  currency: string;
  salary: {
    headcount: number;
    min: string | null;
    max: string | null;
    average: string | null;
    median: string | null;
  };
  averageByJobTitle: { jobTitle: string; department: string; headcount: number; average: string }[];
  headcountByDepartment: { department: string; headcount: number }[];
}

/** Static between deploys (the server caches it an hour): fetched once, never stale. */
export function useReference() {
  return useQuery({
    queryKey: ['reference'],
    queryFn: ({ signal }) => api<Reference>('/reference', { signal }),
    staleTime: Infinity,
  });
}

/**
 * One cache entry per country (the query key is the cache key). While the next country loads, the last
 * one's figures stay on screen (`keepPreviousData`), flagged by `isPlaceholderData` for dimming.
 */
export function useInsights(countryCode: string, enabled: boolean) {
  return useQuery({
    queryKey: ['insights', countryCode],
    queryFn: ({ signal }) => api<CountryInsights>(`/insights/countries/${countryCode}`, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled,
  });
}
