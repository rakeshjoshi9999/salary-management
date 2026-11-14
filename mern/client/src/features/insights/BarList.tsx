import { useId } from 'react';

export interface Bar {
  /** Stable and unique: React matches list items between renders by key, never by position. */
  key: string;
  label: string;
  detail?: string;
  value: number;
  display: string;
}

/** A ranked list with proportional bars: semantic HTML, so it is text to a screen reader and to tests. */
export function BarList({ title, bars }: { title: string; bars: Bar[] }) {
  const headingId = useId();
  const max = Math.max(...bars.map((bar) => bar.value), 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 id={headingId} className="mb-3 text-lg font-semibold">
        {title}
      </h2>
      <ol aria-labelledby={headingId} className="space-y-3">
        {bars.map((bar) => (
          <li key={bar.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                <span className="font-medium">{bar.label}</span>
                {bar.detail && <span className="ml-2 text-slate-500">{bar.detail}</span>}
              </span>
              <span className="tabular-nums">{bar.display}</span>
            </div>
            <div className="h-2 rounded bg-slate-100" aria-hidden="true">
              <div
                data-bar
                className="h-2 rounded bg-slate-700 transition-[width] duration-300"
                style={{ width: `${max > 0 ? (bar.value / max) * 100 : 0}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
