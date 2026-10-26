import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';

/** A request pending this long counts as a cold start (ADR-027). */
export const SLOW_REQUEST_MS = 3_000;

@Injectable({ providedIn: 'root' })
export class ColdStartTracker {
  private readonly slowRequests = signal(0);
  readonly waking = computed(() => this.slowRequests() > 0);

  slowStarted(): void {
    void this.slowRequests;
  }

  slowFinished(): void {
    void this.slowRequests;
  }
}

export const coldStartInterceptor: HttpInterceptorFn = (request, next) => next(request);
