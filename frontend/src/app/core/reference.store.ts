import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { Country, CountryCode, Department, ReferenceData } from './api.models';
import { apiUrl } from './api-url';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Countries, departments and titles, loaded once per session without blocking the app (ADR-051).
 * Filters and forms wait for `ready`; a failure shows an app-level error with Retry.
 */
@Injectable({ providedIn: 'root' })
export class ReferenceStore {
  private readonly http = inject(HttpClient);
  private readonly data = signal<ReferenceData | null>(null);

  readonly status = signal<LoadStatus>('idle');
  readonly ready = computed(() => this.status() === 'ready');
  readonly countries = computed<readonly Country[]>(() => this.data()?.countries ?? []);
  readonly departments = computed<readonly Department[]>(() => this.data()?.departments ?? []);
  private readonly allTitles = computed(() =>
    this.departments()
      .flatMap((d) => d.jobTitles)
      .sort((a, b) => a.localeCompare(b)),
  );

  load(): void {
    if (this.status() === 'loading' || this.status() === 'ready') {
      return;
    }
    this.status.set('loading');
    this.http.get<ReferenceData>(apiUrl('/reference')).subscribe({
      next: (data) => {
        this.data.set(data);
        this.status.set('ready');
      },
      error: () => this.status.set('error'),
    });
  }

  retry(): void {
    this.load();
  }

  /** A department's titles, or every title when no department is chosen. */
  titlesFor(department: string | null | undefined): readonly string[] {
    if (!department) {
      return this.allTitles();
    }
    return this.departments().find((d) => d.name === department)?.jobTitles ?? [];
  }

  country(code: CountryCode | null | undefined): Country | undefined {
    return this.countries().find((c) => c.code === code);
  }
}
