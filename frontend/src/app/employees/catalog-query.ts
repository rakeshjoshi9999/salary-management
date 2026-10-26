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

export function parseCatalogQuery(_params: Params, _reference: ReferenceData): ParsedCatalogQuery {
  return { query: DEFAULT_QUERY, ignored: [] };
}

export function toQueryParams(_query: CatalogQuery): Params {
  return {};
}

export function toListRequest(_query: CatalogQuery): EmployeeListQuery {
  return {};
}
