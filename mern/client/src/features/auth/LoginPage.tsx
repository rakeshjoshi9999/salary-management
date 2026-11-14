import { useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';

import { ApiError } from '../../lib/api';
import { useAuth } from './AuthProvider';
import { button, field, fieldError, input, label } from './formStyles';

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Built by hand on purpose (ADR-M4): controlled inputs, where React state is the single source of truth
 * and every keystroke goes value → onChange → setState → re-render. Angular twin: `[(ngModel)]`.
 * Leaving the page after success is GuestOnly's job, so this page never navigates itself.
 */
export function LoginPage() {
  const { login } = useAuth();
  const [params] = useSearchParams();
  const notice = (useLocation().state as { notice?: string } | null)?.notice;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // a form submit would reload the page; React handles it instead
    const found: FieldErrors = {};
    if (!email.trim()) found.email = 'Enter your email.';
    if (!password) found.password = 'Enter your password.';
    setErrors(found);
    if (found.email || found.password) {
      // Move focus to the first invalid field, so a screen reader announces its error (as RHF does).
      document.getElementById(found.email ? 'login-email' : 'login-password')?.focus();
      return;
    }

    setSubmitting(true);
    setFailure(null);
    try {
      await login(email.trim(), password);
    } catch (error) {
      // One message for a wrong email or a wrong password: naming which would enumerate users.
      setFailure(
        error instanceof ApiError && error.code === 'INVALID_CREDENTIALS'
          ? 'Email or password is incorrect.'
          : 'Sign-in failed. Please try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {params.get('reason') === 'expired' && (
        <p role="status" className="rounded-md bg-amber-50 p-3 text-amber-800">
          Your session has expired. Please sign in again.
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md bg-green-50 p-3 text-green-800">
          {notice}
        </p>
      )}
      {failure && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-red-800">
          {failure}
        </p>
      )}

      <form noValidate onSubmit={onSubmit} className="space-y-4">
        <div className={field}>
          <label htmlFor="login-email" className={label}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            className={input}
          />
          {errors.email && (
            <p id="login-email-error" className={fieldError}>
              {errors.email}
            </p>
          )}
        </div>
        <div className={field}>
          <label htmlFor="login-password" className={label}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            className={input}
          />
          {errors.password && (
            <p id="login-password-error" className={fieldError}>
              {errors.password}
            </p>
          )}
        </div>
        <button type="submit" disabled={submitting} className={button}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-slate-600">
        No account?{' '}
        <Link to="/register" className="font-medium text-blue-700 underline">
          Create one
        </Link>
      </p>
    </section>
  );
}
