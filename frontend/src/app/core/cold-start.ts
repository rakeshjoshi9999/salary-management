import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { defer, finalize } from 'rxjs';

/** A request pending this long counts as a cold start (ADR-027). */
export const SLOW_REQUEST_MS = 3_000;

/** Whether the server looks like it is waking up: any request has waited 3 s and not finished. */
@Injectable({ providedIn: 'root' })
export class ColdStartTracker {
  private readonly slowRequests = signal(0);
  readonly waking = computed(() => this.slowRequests() > 0);

  slowStarted(): void {
    this.slowRequests.update((n) => n + 1);
  }

  slowFinished(): void {
    this.slowRequests.update((n) => Math.max(0, n - 1));
  }
}

export const coldStartInterceptor: HttpInterceptorFn = (request, next) => {
  const tracker = inject(ColdStartTracker);
  return defer(() => {
    let slow = false;
    const timer = setTimeout(() => {
      slow = true;
      tracker.slowStarted();
    }, SLOW_REQUEST_MS);
    // finalize covers success, failure and a dropped subscription (switchMap, timeout).
    return next(request).pipe(
      finalize(() => {
        clearTimeout(timer);
        if (slow) {
          tracker.slowFinished();
        }
      }),
    );
  });
};
