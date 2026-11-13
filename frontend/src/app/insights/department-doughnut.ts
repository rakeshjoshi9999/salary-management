import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';

import { DepartmentHeadcount } from '../core/api.models';
import { ThemeService } from '../core/theme';

/**
 * Up to six departments, starting with the brand indigo. Each colour is at least 3:1 against its mode's
 * card (WCAG 1.4.11): 600s on white, 400s on slate-900. Outlines in the card colour keep neighbours
 * apart for colour-blind readers.
 */
export const LIGHT_SLICES: readonly string[] = [
  '#4f46e5', // indigo-600
  '#0d9488', // teal-600
  '#d97706', // amber-600
  '#e11d48', // rose-600
  '#0284c7', // sky-600
  '#c026d3', // fuchsia-600
];
export const DARK_SLICES: readonly string[] = [
  '#818cf8', // indigo-400
  '#2dd4bf', // teal-400
  '#fbbf24', // amber-400
  '#fb7185', // rose-400
  '#38bdf8', // sky-400
  '#e879f9', // fuchsia-400
];

/** The card colours in styles.css. A canvas cannot read CSS variables, so they are repeated here. */
const CARD = { light: '#ffffff', dark: '#0f172a' } as const;

/**
 * Headcount by department as a Chart.js doughnut (ADR-029). Angles are hard to compare, so the total
 * sits in the centre and the legend lists each department's count and share. Colours follow the theme
 * (ADR-054), redrawn when it changes.
 */
@Component({
  selector: 'app-department-doughnut',
  imports: [ChartModule, DecimalPipe],
  template: `
    <div class="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div class="relative size-48 shrink-0">
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
          <span class="text-2xl font-semibold tabular-nums text-ink">{{ total() | number }}</span>
          <span class="text-xs text-ink-muted">employees</span>
        </div>
      </div>
      <ul class="w-full flex-1 divide-y divide-line text-sm" aria-label="Headcount by department">
        @for (row of legend(); track row.department) {
          <li data-testid="legend-row" class="flex items-center gap-3 py-2">
            <span
              data-testid="legend-swatch"
              class="inline-block size-3 shrink-0 rounded-full"
              [style.background-color]="row.colour"
              aria-hidden="true"
            ></span>
            <span class="flex-1 text-ink">{{ row.department }}</span
            >&ngsp;
            <span class="tabular-nums font-medium text-ink">{{ row.headcount | number }}</span
            >&ngsp;
            <span class="w-10 text-right tabular-nums text-ink-muted">{{ row.percent }}%</span>
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

  private readonly theme = inject(ThemeService);
  private readonly palette = computed(() => (this.theme.dark() ? DARK_SLICES : LIGHT_SLICES));

  protected readonly legend = computed(() =>
    this.departments().map((row, i) => ({
      ...row,
      colour: this.palette()[i % this.palette().length],
      percent: this.total() > 0 ? Math.round((row.headcount / this.total()) * 100) : 0,
    })),
  );

  protected readonly chartData = computed(() => ({
    labels: this.departments().map((row) => row.department),
    datasets: [
      {
        data: this.departments().map((row) => row.headcount),
        backgroundColor: this.legend().map((row) => row.colour),
        borderWidth: 2,
        borderColor: this.theme.dark() ? CARD.dark : CARD.light,
        hoverOffset: 6,
      },
    ],
  }));

  protected readonly options = {
    cutout: '72%',
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };
}
