import { useHealth } from './useHealth';

const RESULT = {
  UP: <span className="font-medium text-green-700">The server is up.</span>,
  DOWN: (
    <span className="font-medium text-amber-700">
      The server is down: it is running but cannot reach its database.
    </span>
  ),
};

export function HealthPage() {
  const { status, data, isFetching, refetch } = useHealth();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Server health</h1>

      {/* One live region that stays mounted, so a screen reader hears each change of state. */}
      <p role="status" className="text-slate-600">
        {status === 'pending' && 'Checking the server…'}
        {/* Branch on `status`, not on `data`: a failed refetch keeps the last good data. */}
        {status === 'success' && RESULT[data]}
      </p>

      {status === 'error' && (
        <div role="alert" className="space-y-3 rounded-md border border-red-300 bg-red-50 p-4">
          <p className="text-red-800">Could not reach the server.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
          >
            {isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
    </section>
  );
}
