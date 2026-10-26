import { InjectionToken } from '@angular/core';

/** The current time, injected so tests never read the real clock (CLAUDE.md testing standards). */
export const CLOCK = new InjectionToken<() => Date>('CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/** Today in UTC as an ISO date, the API's rule for the latest hire date (ADR-010). */
export function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}
