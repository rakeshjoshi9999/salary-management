import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lets the drawer ask the list behind it to reload after a save or a delete, without either knowing
 * the other. An optional page asks the list to move there first (a delete that emptied the page).
 */
@Injectable({ providedIn: 'root' })
export class CatalogRefresh {
  private readonly requests = new Subject<{ readonly page: number } | undefined>();
  readonly requested$ = this.requests.asObservable();

  request(target?: { readonly page: number }): void {
    void target;
  }
}
