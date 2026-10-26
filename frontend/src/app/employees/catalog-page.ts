import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  debounceTime,
  filter,
  map,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { Employee, EmployeePage, SortField } from '../core/api.models';
import { ReferenceStore } from '../core/reference.store';
import { MoneyPipe } from '../shared/money.pipe';
import {
  CatalogQuery,
  DEFAULT_QUERY,
  activeFilterCount,
  hasAnyFilter,
  parseCatalogQuery,
  toListRequest,
  toQueryParams,
} from './catalog-query';
import { EmployeeService } from './employee.service';

type LoadResult = { ok: true; page: EmployeePage; query: CatalogQuery } | { ok: false };

export const SORT_OPTIONS = [
  { value: 'fullName,asc', label: 'Name A–Z' },
  { value: 'fullName,desc', label: 'Name Z–A' },
  { value: 'salary,desc', label: 'Salary, highest first' },
  { value: 'salary,asc', label: 'Salary, lowest first' },
  { value: 'hireDate,desc', label: 'Hired, newest first' },
  { value: 'hireDate,asc', label: 'Hired, oldest first' },
] as const;

/**
 * The Catalog (UI_DESIGN.md). The URL is the only source of truth (ADR-051): every action navigates,
 * and the list follows the URL through one switchMap, so a newer query cancels an older request.
 */
@Component({
  selector: 'app-catalog-page',
  imports: [
    RouterOutlet,
    RouterLink,
    TableModule,
    PaginatorModule,
    ButtonModule,
    SkeletonModule,
    MoneyPipe,
    DecimalPipe,
  ],
  templateUrl: './catalog-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employees = inject(EmployeeService);
  private readonly toast = inject(MessageService);
  protected readonly reference = inject(ReferenceStore);

  protected readonly query = signal<CatalogQuery>(DEFAULT_QUERY);
  protected readonly result = signal<EmployeePage | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly searchText = signal('');
  protected readonly searchHint = signal(false);
  protected readonly filtersOpen = signal(false);

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);

  protected readonly rows = computed<Employee[]>(() => [...(this.result()?.items ?? [])]);
  protected readonly total = computed(() => this.result()?.totalItems ?? 0);
  protected readonly titleOptions = computed(() =>
    this.reference.titlesFor(this.query().department),
  );
  protected readonly filterCount = computed(() => activeFilterCount(this.query()));
  protected readonly filtered = computed(() => hasAnyFilter(this.query()));
  protected readonly sortValue = computed(
    () => `${this.query().sortField},${this.query().sortDirection}`,
  );
  /** From the loaded page, so it matches the rows on screen while the next page loads. */
  protected readonly range = computed(() => {
    const loaded = this.result();
    const page = loaded?.page ?? 0;
    const size = loaded?.size ?? this.query().size;
    const from = page * size + 1;
    return { from, to: Math.min(from + size - 1, this.total()) };
  });

  /** Typed text still waiting in the debounce. */
  private searchPending = false;

  /** One toast per link: cleared when the user changes the list themselves. */
  private linkToastShown = false;

  private readonly retry$ = new BehaviorSubject<void>(undefined);
  private readonly search$ = new Subject<string>();

  constructor() {
    this.reference.load();

    // Valid queries from the URL, once reference data is there to check them against. An invalid
    // link is replaced with its clean version, which comes back through here as a valid query.
    const queries$: Observable<CatalogQuery> = toObservable(this.reference.ready).pipe(
      filter(Boolean),
      take(1),
      switchMap(() => this.route.queryParams),
      map((params) =>
        parseCatalogQuery(params, {
          countries: this.reference.countries(),
          departments: this.reference.departments(),
        }),
      ),
      tap(({ query, ignored }) => {
        if (ignored.length > 0) {
          this.linkIgnored();
          this.navigate(query, true);
        }
      }),
      filter(({ ignored }) => ignored.length === 0),
      map(({ query }) => query),
    );

    queries$
      .pipe(
        tap((query) => {
          this.query.set(query);
          const q = query.q ?? '';
          // Only when the URL disagrees with the box (Back, Clear filters): leaves the caret alone
          // while typing, and replaces any search still waiting in the debounce.
          if (q !== this.searchText().trim()) {
            this.searchText.set(q);
            if (this.searchPending) {
              this.search$.next(q);
            }
          }
          this.searchHint.set(false);
        }),
        switchMap((query) => this.retry$.pipe(map(() => query))),
        switchMap((query): Observable<LoadResult> => {
          this.status.set('loading');
          return this.employees.list(toListRequest(query)).pipe(
            map((page): LoadResult => ({ ok: true, page, query })),
            catchError(() => of<LoadResult>({ ok: false })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((loaded) => this.show(loaded));

    this.search$
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe((text) => this.search(text.trim()));
  }

  protected onSearchInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.searchText.set(text);
    this.searchPending = true;
    this.search$.next(text);
  }

  protected setCountry(value: string): void {
    this.navigate({ ...this.query(), country: value || undefined, page: 0 });
  }

  protected setDepartment(value: string): void {
    const department = value || undefined;
    const jobTitle = this.query().jobTitle;
    const keepTitle = jobTitle && this.reference.titlesFor(department).includes(jobTitle);
    this.navigate({
      ...this.query(),
      department,
      jobTitle: keepTitle ? jobTitle : undefined,
      page: 0,
    });
  }

  protected setTitle(value: string): void {
    this.navigate({ ...this.query(), jobTitle: value || undefined, page: 0 });
  }

  protected sortBy(field: SortField): void {
    const current = this.query();
    const direction =
      current.sortField === field && current.sortDirection === 'asc' ? 'desc' : 'asc';
    this.navigate({ ...current, sortField: field, sortDirection: direction, page: 0 });
  }

  protected setSort(value: string): void {
    const [field, direction] = value.split(',') as [SortField, 'asc' | 'desc'];
    this.navigate({ ...this.query(), sortField: field, sortDirection: direction, page: 0 });
  }

  protected ariaSort(field: SortField): 'ascending' | 'descending' | 'none' {
    const { sortField, sortDirection } = this.query();
    if (sortField !== field) {
      return 'none';
    }
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  protected sortGlyph(field: SortField): string {
    const sort = this.ariaSort(field);
    return sort === 'ascending' ? '▲' : sort === 'descending' ? '▼' : '';
  }

  protected onPage(event: PaginatorState): void {
    const current = this.query();
    const rows = (event.rows ?? current.size) as CatalogQuery['size'];
    const page = rows !== current.size ? 0 : Math.floor((event.first ?? 0) / rows);
    this.navigate({ ...current, size: rows, page });
  }

  protected open(employee: Employee): void {
    void this.router.navigate([employee.id], {
      relativeTo: this.route,
      queryParamsHandling: 'preserve',
    });
  }

  protected add(): void {
    void this.router.navigate(['new'], { relativeTo: this.route, queryParamsHandling: 'preserve' });
  }

  protected clearFilters(): void {
    void this.router.navigate([], { relativeTo: this.route });
  }

  protected retry(): void {
    this.retry$.next();
  }

  private search(text: string): void {
    this.searchPending = false;
    if (text.length === 1) {
      this.searchHint.set(true);
      return;
    }
    this.searchHint.set(false);
    if (text === (this.query().q ?? '')) {
      return;
    }
    // Typing replaces the history entry, so Back does not step through every search (ADR-051).
    this.navigate({ ...this.query(), q: text || undefined, page: 0 }, true);
  }

  private show(loaded: LoadResult): void {
    if (!loaded.ok) {
      this.status.set('error');
      return;
    }
    const { page, query } = loaded;
    const lastPage = Math.max(0, page.totalPages - 1);
    if (query.page > lastPage) {
      this.linkIgnored();
      this.navigate({ ...query, page: lastPage }, true);
      return;
    }
    this.result.set(page);
    this.status.set('ready');
  }

  private linkIgnored(): void {
    if (this.linkToastShown) {
      return;
    }
    this.linkToastShown = true;
    this.toast.add({
      severity: 'warn',
      summary: 'Part of the link was ignored',
      detail: 'Some filters in the link were not recognised and were ignored.',
    });
  }

  private navigate(query: CatalogQuery, replaceUrl = false): void {
    this.linkToastShown = replaceUrl && this.linkToastShown;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams(query),
      replaceUrl,
    });
  }
}
