import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { DepartmentHeadcount } from '../core/api.models';

/** Headcount by department as a Chart.js doughnut, with the total in the centre (ADR-029). */
@Component({
  selector: 'app-department-doughnut',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentDoughnut {
  readonly departments = input.required<readonly DepartmentHeadcount[]>();
  readonly total = input.required<number>();
}
