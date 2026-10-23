import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';

/**
 * What the API said about itself. `reachable` is false only when the API
 * answered and reported something other than UP - a failure to reach it at all
 * surfaces as an error on the stream, because those are different facts and the
 * page must not conflate them.
 */
export interface HealthResult {
  readonly reachable: boolean;
  readonly status: string;
}

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  /**
   * Boot's health status aggregates the datasource indicator, so UP cannot be
   * reported while the database is unreachable. One request therefore proves
   * the whole chain rather than just that the API process is alive.
   */
  check(): Observable<HealthResult> {
    return this.http
      .get<{ status: string }>(`${environment.apiBaseUrl}/actuator/health`)
      .pipe(map((response) => ({ reachable: response.status === 'UP', status: response.status })));
  }
}
