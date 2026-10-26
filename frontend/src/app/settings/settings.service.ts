import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';

import { Settings, SettingsUpdateRequest } from '../core/api.models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  get(): Observable<Settings> {
    void this.http;
    return EMPTY;
  }

  update(_body: SettingsUpdateRequest): Observable<Settings> {
    return EMPTY;
  }
}
