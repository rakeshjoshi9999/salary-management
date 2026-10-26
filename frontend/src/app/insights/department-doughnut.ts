import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';

import { DepartmentHeadcount } from '../core/api.models';

/**
 * Up to six departments. Each colour is at least 3:1 against the white card (WCAG 1.4.11), and white
 * outlines between slices keep neighbours apart for colour-blind readers.
 */
const COLOURS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#a16207'];

/**
 * Headcount by department as a Chart.js doughnut (ADR-029). Angles are hard to compare, so the total
 * sits in the centre and the legend lists each department's count and share.
 */
@Component({
  selector: 'app-department-doughnut',
  imports: [ChartModule, DecimalPipe],
  template: `
    <div class="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div class="relative h-48 w-48 shrink-0">
        <!-- The legend list is the accessible version of the chart (ADR-029), so the canvas is hidden. -->
        <p-chart
          type="doughnut"
          aria-hidden="true"
          [data]="chartData()"
          [options]="options"
          height="12rem"
        />
        <div
          data-testid="doughnut-total"
          class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <span class="text-xl font-semibold tabular-nums text-surface-900">{{
            total() | number
          }}</span>
          <span class="text-xs text-surface-600">total</span>
        </div>
      </div>
      <ul class="w-full flex-1 text-sm" aria-label="Headcount by department">
        @for (row of legend(); track row.department) {
          <li data-testid="legend-row" class="flex items-center gap-2 py-1">
            <span
              class="inline-block h-3 w-3 shrink-0 rounded-sm"
              [style.background-color]="row.colour"
              aria-hidden="true"
            ></span>
            <span class="flex-1 text-surface-900">{{ row.department }}</span
            >&ngsp; <span class="tabular-nums text-surface-800">{{ row.headcount | number }}</span
            >&ngsp;
            <span class="w-10 text-right tabular-nums text-surface-600">{{ row.percent }}%</span>
          </li>
        }
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentDoughnut {
  readonly departments = input.required<readonly DepartmentHeadcount[]>();
  readonly total = input.required<number>();

  protected readonly legend = computed(() =>
    this.departments().map((row, i) => ({
      ...row,
      colour: COLOURS[i % COLOURS.length],
      percent: this.total() > 0 ? Math.round((row.headcount / this.total()) * 100) : 0,
    })),
  );

  protected readonly chartData = computed(() => ({
    labels: this.departments().map((row) => row.department),
    datasets: [
      {
        data: this.departments().map((row) => row.headcount),
        backgroundColor: this.departments().map((_, i) => COLOURS[i % COLOURS.length]),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }));

  protected readonly options = {
    cutout: '68%',
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };
}
