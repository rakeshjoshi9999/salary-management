import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';

import { CountryCode, CountryInsights } from '../core/api.models';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly http = inject(HttpClient);

  forCountry(_code: CountryCode): Observable<CountryInsights> {
    void this.http;
    return EMPTY;
  }
}
