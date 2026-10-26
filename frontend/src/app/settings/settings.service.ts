import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Settings, SettingsUpdateRequest } from '../core/api.models';
import { apiUrl } from '../core/api-url';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  get(): Observable<Settings> {
    return this.http.get<Settings>(apiUrl('/settings'));
  }

  update(body: SettingsUpdateRequest): Observable<Settings> {
    const { defaultCountryCode, version } = body;
    return this.http.put<Settings>(apiUrl('/settings'), { defaultCountryCode, version });
  }
}
