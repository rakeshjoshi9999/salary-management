import { Params } from '@angular/router';

import { EmployeeListQuery, ReferenceData, SortDirection, SortField } from '../core/api.models';

export const PAGE_SIZES = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** The Catalog's whole state, as read from the URL (ADR-051: the URL is the only source of truth). */
export interface CatalogQuery {
  readonly q?: string;
  readonly country?: string;
  readonly department?: string;
  readonly jobTitle?: string;
  readonly sortField: SortField;
  readonly sortDirection: SortDirection;
  /** 0-based, like the API. */
  readonly page: number;
  readonly size: PageSize;
}

export interface ParsedCatalogQuery {
  readonly query: CatalogQuery;
  /** Parameter names whose values were dropped or clamped. */
  readonly ignored: readonly string[];
}

export const DEFAULT_QUERY: CatalogQuery = {
  sortField: 'fullName',
  sortDirection: 'asc',
  page: 0,
  size: 20,
};

const KNOWN_PARAMS = new Set(['q', 'country', 'department', 'jobTitle', 'sort', 'page', 'size']);
const SORT_PATTERN = /^(fullName|salary|hireDate)(?:,(asc|desc))?$/;
const WHOLE_NUMBER = /^\d+$/;
const MAX_PAGE = 1_000_000;

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Checks every value in a link against the reference data and the API's rules (ADR-051). Invalid
 * values are dropped or clamped and named in `ignored`, so the page can replace the URL and say so.
 */
export function parseCatalogQuery(params: Params, reference: ReferenceData): ParsedCatalogQuery {
  const ignored: string[] = [];
  const query: Mutable<CatalogQuery> = { ...DEFAULT_QUERY };

  /** A single value, or undefined. A repeated parameter is invalid (the API rejects it too). */
  const read = (key: string): string | undefined => {
    const value: unknown = params[key];
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (Array.isArray(value) || typeof value === 'object') {
      ignored.push(key);
      return undefined;
    }
    return String(value);
  };
  const accept = (key: string, valid: boolean): boolean => {
    if (!valid) {
      ignored.push(key);
    }
    return valid;
  };

  for (const key of Object.keys(params)) {
    if (!KNOWN_PARAMS.has(key)) {
      ignored.push(key);
    }
  }

  const q = read('q')?.trim();
  if (q && accept('q', q.length >= 2 && q.length <= 254)) {
    query.q = q;
  }

  const country = read('country');
  if (
    country &&
    accept(
      'country',
      reference.countries.some((c) => c.code === country),
    )
  ) {
    query.country = country;
  }

  const department = read('department');
  if (
    department &&
    accept(
      'department',
      reference.departments.some((d) => d.name === department),
    )
  ) {
    query.department = department;
  }

  const jobTitle = read('jobTitle');
  if (
    jobTitle &&
    accept(
      'jobTitle',
      reference.departments.some((d) => d.jobTitles.includes(jobTitle)),
    )
  ) {
    query.jobTitle = jobTitle;
  }

  const sort = read('sort');
  const sortMatch = sort ? SORT_PATTERN.exec(sort) : null;
  if (sort && accept('sort', sortMatch !== null) && sortMatch) {
    query.sortField = sortMatch[1] as SortField;
    query.sortDirection = (sortMatch[2] as SortDirection | undefined) ?? 'asc';
  }

  const page = read('page');
  // Far past any real total, and beyond what the API's page arithmetic accepts.
  if (page && accept('page', WHOLE_NUMBER.test(page) && Number(page) <= MAX_PAGE)) {
    query.page = Number(page);
  }

  const size = read('size');
  if (
    size &&
    accept('size', WHOLE_NUMBER.test(size) && PAGE_SIZES.includes(Number(size) as PageSize))
  ) {
    query.size = Number(size) as PageSize;
  }

  return { query, ignored };
}

function sortParam(query: CatalogQuery): string {
  return `${query.sortField},${query.sortDirection}`;
}

/** The URL form of a query. Defaults are left out, which keeps links short (ADR-051). */
export function toQueryParams(query: CatalogQuery): Params {
  const params: Params = {};
  if (query.q) params['q'] = query.q;
  if (query.country) params['country'] = query.country;
  if (query.department) params['department'] = query.department;
  if (query.jobTitle) params['jobTitle'] = query.jobTitle;
  if (query.sortField !== DEFAULT_QUERY.sortField || query.sortDirection !== 'asc') {
    params['sort'] = sortParam(query);
  }
  if (query.page !== 0) params['page'] = query.page;
  if (query.size !== DEFAULT_QUERY.size) params['size'] = query.size;
  return params;
}

/** The API request for a query. Everything is sent explicitly, so the API's defaults never matter. */
export function toListRequest(query: CatalogQuery): EmployeeListQuery {
  return {
    q: query.q,
    country: query.country,
    department: query.department,
    jobTitle: query.jobTitle,
    sort: sortParam(query),
    page: query.page,
    size: query.size,
  };
}

/** How many panel filters are set (search sits outside the panel, so it does not count). */
export function activeFilterCount(query: CatalogQuery): number {
  return [query.country, query.department, query.jobTitle].filter(Boolean).length;
}

export function hasAnyFilter(query: CatalogQuery): boolean {
  return Boolean(query.q) || activeFilterCount(query) > 0;
}
