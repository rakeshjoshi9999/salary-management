import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { UIChart } from 'primeng/chart';

import { MATCH_MEDIA, THEME_STORAGE, ThemeService } from '../core/theme';
import { DARK_SLICES, DepartmentDoughnut, LIGHT_SLICES } from './department-doughnut';

const DEPARTMENTS = [
  { department: 'Sales', headcount: 2000 },
  { department: 'Engineering', headcount: 1000 },
  { department: 'Finance', headcount: 500 },
];

/** Card colours from styles.css: white in light, slate-900 in dark (ADR-054). */
const LIGHT_CARD = '#ffffff';
const DARK_CARD = '#0f172a';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

interface DoughnutData {
  datasets: { backgroundColor: string[]; borderColor: string }[];
}

/** Headcount by department, themed for light and dark (ADR-029, ADR-054). */
describe('DepartmentDoughnut', () => {
  let fixture: ComponentFixture<DepartmentDoughnut>;
  let stored: Map<string, string>;

  async function render(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: THEME_STORAGE,
          useValue: {
            getItem: (key: string) => stored.get(key) ?? null,
            setItem: (key: string, value: string) => stored.set(key, value),
          },
        },
        {
          provide: MATCH_MEDIA,
          useValue: () => ({
            matches: false,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
          }),
        },
      ],
    });
    fixture = TestBed.createComponent(DepartmentDoughnut);
    fixture.componentRef.setInput('departments', DEPARTMENTS);
    fixture.componentRef.setInput('total', 3500);
    await fixture.whenStable();
  }

  const dataset = () =>
    (
      fixture.debugElement.query(By.directive(UIChart)).componentInstance as UIChart & {
        data: DoughnutData;
      }
    ).data.datasets[0];

  const swatches = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="legend-swatch"]'),
    ).map((swatch) => (swatch as HTMLElement).style.backgroundColor);

  /** `#4f46e5` as the DOM reports a style colour: `rgb(79, 70, 229)`. */
  const rgb = (hex: string) =>
    `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

  async function turnDark(): Promise<void> {
    const theme = TestBed.inject(ThemeService);
    theme.cycle(); // light
    theme.cycle(); // dark
    await fixture.whenStable();
  }

  beforeEach(() => {
    stored = new Map();
  });

  afterEach(() => document.documentElement.classList.remove('app-dark'));

  it('uses the light palette on a light page', async () => {
    await render();

    expect(dataset().backgroundColor).toEqual(LIGHT_SLICES.slice(0, 3));
    expect(dataset().backgroundColor[0]).toBe('#4f46e5'); // indigo-600, the brand colour first
    expect(dataset().borderColor).toBe(LIGHT_CARD);
  });

  it('switches to the dark palette when the theme turns dark', async () => {
    await render();

    await turnDark();

    expect(dataset().backgroundColor).toEqual(DARK_SLICES.slice(0, 3));
    expect(dataset().backgroundColor[0]).toBe('#818cf8'); // indigo-400
    expect(dataset().borderColor).toBe(DARK_CARD);
  });

  it('keeps every slice at 3:1 against the card', () => {
    for (const [palette, card] of [
      [LIGHT_SLICES, LIGHT_CARD],
      [DARK_SLICES, DARK_CARD],
    ] as const) {
      for (const colour of palette) {
        expect(contrast(colour, card), `${colour} on ${card}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('matches the legend swatches to the slices, in both modes', async () => {
    await render();
    expect(swatches()).toEqual(dataset().backgroundColor.map(rgb));

    await turnDark();

    expect(swatches()).toEqual(dataset().backgroundColor.map(rgb));
  });
});
