import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CountryCode, CountryInsights } from '../core/api.models';
import { apiUrl } from '../core/api-url';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly http = inject(HttpClient);

  forCountry(code: CountryCode): Observable<CountryInsights> {
    return this.http.get<CountryInsights>(
      apiUrl(`/insights/countries/${encodeURIComponent(code)}`),
    );
  }
}
