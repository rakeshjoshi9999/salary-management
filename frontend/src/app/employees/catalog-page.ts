import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ReferenceStore } from '../core/reference.store';

@Component({
  selector: 'app-catalog-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  constructor() {
    inject(ReferenceStore).load();
  }
}
