import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';

import { api, ApiError } from '../../lib/api';
import { useAuth } from './AuthProvider';
import { button, field, fieldError, input, label } from './formStyles';

/** The same rules the server applies (ADR-M3): checked here first so a bad form never travels. */
const schema = z.object({
  email: z.email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});
type Values = z.infer<typeof schema>;

/**
 * React Hook Form + Zod (ADR-M4): uncontrolled inputs registered by ref, so typing does not re-render the
 * form; Zod validates on submit. Angular twin: a reactive `FormGroup` with validators.
 */
export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // A write, so a mutation: run on demand, never cached, never retried.
  const signUp = useMutation({
    mutationFn: (values: Values) =>
      api('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      }),
  });

  async function onSubmit(values: Values) {
    try {
      await signUp.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') {
        setError('email', { message: 'That email is already registered.' });
      } else {
        setError('root', { message: 'Registration failed. Please try again.' });
      }
      return;
    }
    try {
      await login(values.email, values.password); // GuestOnly then sends the user home
    } catch {
      navigate('/login', { replace: true, state: { notice: 'Account created. Please sign in.' } });
    }
  }

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-semibold">Create an account</h1>

      {errors.root && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-red-800">
          {errors.root.message}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className={field}>
          <label htmlFor="register-email" className={label}>
            Email
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            {...register('email')}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            className={input}
          />
          {errors.email && (
            <p id="register-email-error" className={fieldError}>
              {errors.email.message}
            </p>
          )}
        </div>
        <div className={field}>
          <label htmlFor="register-password" className={label}>
            Password
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'register-password-error' : undefined}
            className={input}
          />
          {errors.password && (
            <p id="register-password-error" className={fieldError}>
              {errors.password.message}
            </p>
          )}
        </div>
        <button type="submit" disabled={isSubmitting} className={button}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-slate-600">
        Have an account?{' '}
        <Link to="/login" className="font-medium text-blue-700 underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
