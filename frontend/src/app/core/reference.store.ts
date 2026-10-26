import { Injectable, computed, signal } from '@angular/core';

import { Country, CountryCode, Department, ReferenceData } from './api.models';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class ReferenceStore {
  private readonly data = signal<ReferenceData | null>(null);
  readonly status = signal<LoadStatus>('idle');
  readonly ready = computed(() => this.status() === 'ready');
  readonly countries = computed<readonly Country[]>(() => []);
  readonly departments = computed<readonly Department[]>(() => []);

  load(): void {
    void this.data;
  }

  retry(): void {
    this.load();
  }

  titlesFor(_department: string | null | undefined): readonly string[] {
    return [];
  }

  country(_code: CountryCode | null | undefined): Country | undefined {
    return undefined;
  }
}
