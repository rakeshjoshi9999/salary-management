import { useEffect, useId } from 'react';
import { useSearchParams } from 'react-router';

import { BarList } from './BarList';
import { formatCount, formatMoney } from './format';
import { useInsights, useReference, type CountryInsights } from './queries';

/** Until Settings exists, India (ADR-M6). Not written into the URL: `/` stays `/`. */
const DEFAULT_COUNTRY = 'IN';

/**
 * The home page. The country lives in the URL (`?country=DE`), so a reload or a shared link keeps the
 * view; it is derived on every render, never copied into state.
 */
export function InsightsPage() {
  const [params, setParams] = useSearchParams();
  const reference = useReference();
  const selectId = useId();

  const requested = params.get('country');
  const countries = reference.data?.countries;
  const known = requested !== null && !!countries?.some((country) => country.code === requested);
  const code = known ? requested : DEFAULT_COUNTRY;

  // A code the reference data does not know is corrected, replacing the history entry so that Back does
  // not return to it. Until the reference data arrives, nothing is fetched for it.
  useEffect(() => {
    if (countries && requested !== null && !countries.some((c) => c.code === requested)) {
      setParams({ country: DEFAULT_COUNTRY }, { replace: true });
    }
  }, [countries, requested, setParams]);

  const insights = useInsights(code, requested === null || known);
  const countryName = countries?.find((country) => country.code === code)?.name ?? code;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Insights</h1>
        {reference.isError && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-md border border-red-300 bg-red-50 p-3"
          >
            <p className="text-red-800">Couldn't load the country list.</p>
            <button
              type="button"
              onClick={() => void reference.refetch()}
              disabled={reference.isFetching}
              className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
            >
              {reference.isFetching ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}
        {/* Shown once the countries are known: an empty dropdown helps nobody. */}
        {countries && (
          <div className="space-y-1">
            <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
              Country
            </label>
            <select
              id={selectId}
              value={code}
              onChange={(event) => setParams({ country: event.target.value })}
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {`${country.name} (${country.currency})`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {insights.isPending && !reference.isError && (
        <p role="status" className="text-slate-600">
          Loading insights…
        </p>
      )}

      {insights.isError && (
        <div role="alert" className="space-y-3 rounded-md border border-red-300 bg-red-50 p-4">
          <p className="text-red-800">Couldn't load insights.</p>
          <button
            type="button"
            onClick={() => void insights.refetch()}
            disabled={insights.isFetching}
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
          >
            {insights.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      {insights.data && (
        // While another country loads, these are the previous country's figures: dimmed and marked busy.
        <section
          aria-label="Figures"
          aria-busy={insights.isPlaceholderData}
          className={`space-y-6 transition-opacity ${insights.isPlaceholderData ? 'opacity-50' : ''}`}
        >
          <Figures data={insights.data} countryName={countryName} />
        </section>
      )}
    </section>
  );
}

function Figures({ data, countryName }: { data: CountryInsights; countryName: string }) {
  const { salary, currency } = data;
  if (salary.headcount === 0) {
    return <p className="text-slate-600">No employees in {countryName} yet.</p>;
  }
  const money = (amount: string | null) => (amount === null ? '—' : formatMoney(amount, currency));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Employees" value={formatCount(salary.headcount)} />
        <Tile label="Minimum" value={money(salary.min)} />
        <Tile label="Median" value={money(salary.median)} />
        <Tile label="Average" value={money(salary.average)} />
        <Tile label="Maximum" value={money(salary.max)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList
          title="Average salary by job title"
          bars={data.averageByJobTitle.map((row) => ({
            key: row.jobTitle,
            label: row.jobTitle,
            detail: row.department,
            value: Number(row.average),
            display: formatMoney(row.average, currency),
          }))}
        />
        <BarList
          title="Headcount by department"
          bars={data.headcountByDepartment.map((row) => ({
            key: row.department,
            label: row.department,
            value: row.headcount,
            display: formatCount(row.headcount),
          }))}
        />
      </div>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="rounded-lg border border-slate-200 bg-white p-3"
    >
      <p id={labelId} className="text-sm text-slate-500">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
