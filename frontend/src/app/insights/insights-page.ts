import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { Observable, Subject, catchError, map, of, startWith, switchMap, tap } from 'rxjs';

import { CountryCode, CountryInsights } from '../core/api.models';
import { ApiError } from '../core/api-error';
import { ReferenceStore } from '../core/reference.store';
import { SettingsService } from '../settings/settings.service';
import { MoneyPipe } from '../shared/money.pipe';
import { DepartmentDoughnut } from './department-doughnut';
import { InsightsService } from './insights.service';

/** India until the HR Manager chooses otherwise (ADR-028), and the fallback if settings fail. */
const FALLBACK_COUNTRY = 'IN';

type Loaded =
  { ok: true; insights: CountryInsights } | { ok: false; code: CountryCode; error: unknown };

/**
 * The Insights dashboard, the landing page (UI_DESIGN.md, ADR-027). The country comes from the URL,
 * then the saved default, then India. Picking a country changes the URL only, never the default.
 */
@Component({
  selector: 'app-insights-page',
  imports: [RouterLink, ButtonModule, SkeletonModule, DepartmentDoughnut, MoneyPipe, DecimalPipe],
  templateUrl: './insights-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly insightsService = inject(InsightsService);
  private readonly settingsService = inject(SettingsService);
  private readonly toast = inject(MessageService);
  protected readonly reference = inject(ReferenceStore);

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly insights = signal<CountryInsights | null>(null);
  protected readonly country = signal<CountryCode>('');

  protected readonly countryName = computed(
    () => this.reference.country(this.country())?.name ?? this.country(),
  );
  protected readonly empty = computed(() => this.insights()?.salary.headcount === 0);
  /** Bar widths as a share of the highest average: a display ratio, not money arithmetic (ADR-015). */
  protected readonly titleRows = computed(() => {
    const rows = this.insights()?.averageByJobTitle ?? [];
    const highest = Math.max(0, ...rows.map((row) => row.average));
    return rows.map((row) => ({
      ...row,
      width: highest > 0 ? `${Math.round((row.average / highest) * 1000) / 10}%` : '0%',
    }));
  });
  protected readonly skeletonCards = [0, 1, 2, 3, 4];

  private readonly retry$ = new Subject<void>();

  constructor() {
    this.reference.load();

    this.route.queryParamMap
      .pipe(
        map((params) => params.get('country')),
        switchMap((code) => (code ? of(code) : this.defaultCountry())),
        tap((code) => this.country.set(code)),
        switchMap((code) =>
          this.retry$.pipe(
            startWith(undefined),
            map(() => code),
          ),
        ),
        switchMap((code): Observable<Loaded> => {
          this.status.set('loading');
          return this.insightsService.forCountry(code).pipe(
            map((insights): Loaded => ({ ok: true, insights })),
            catchError((error: unknown) => of<Loaded>({ ok: false, code, error })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((loaded) => this.show(loaded));
  }

  protected chooseCountry(code: string): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { country: code } });
  }

  protected retry(): void {
    this.retry$.next();
  }

  private defaultCountry(): Observable<CountryCode> {
    return this.settingsService.get().pipe(
      map((settings) => settings.defaultCountryCode),
      catchError(() => of(FALLBACK_COUNTRY)),
    );
  }

  private show(loaded: Loaded): void {
    if (loaded.ok) {
      this.insights.set(loaded.insights);
      this.status.set('ready');
      return;
    }
    if (loaded.error instanceof ApiError && loaded.error.code === 'COUNTRY_NOT_FOUND') {
      // An unknown ?country= falls back to the default, with a toast (UI_DESIGN.md).
      this.toast.add({
        severity: 'warn',
        summary: 'Unknown country',
        detail: `"${loaded.code}" is not a supported country. Showing the default instead.`,
      });
      // Only a ?country= from the link can be dropped; if the default itself is unknown, say so.
      if (this.route.snapshot.queryParamMap.has('country')) {
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
        return;
      }
    }
    this.status.set('error');
  }
}
