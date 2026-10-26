import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lets the drawer ask the list behind it to reload after a save or a delete, without either knowing
 * the other. The list reloads its current page and steps back itself if that page is now empty.
 */
@Injectable({ providedIn: 'root' })
export class CatalogRefresh {
  private readonly requests = new Subject<void>();
  readonly requested$ = this.requests.asObservable();

  request(): void {
    this.requests.next();
  }
}
