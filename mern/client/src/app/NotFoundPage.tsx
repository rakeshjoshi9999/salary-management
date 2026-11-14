import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-slate-600">There is nothing at this address.</p>
      <Link to="/" className="font-medium text-blue-700 underline hover:text-blue-900">
        Go home
      </Link>
    </section>
  );
}
