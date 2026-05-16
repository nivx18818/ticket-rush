'use client';

import type { Route } from 'next';
import type { FormEvent } from 'react';

import { Button, buttonVariants } from '@repo/design-system/components/ui/button';
import { Input } from '@repo/design-system/components/ui/input';
import { cn } from '@repo/design-system/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';

import { ApiError } from '@/lib/api';
import { clientApi } from '@/lib/api/client';

type LoginFormProps = {
  returnTo: string;
};

type LoginFieldName = 'email' | 'password';
type LoginFieldErrors = Partial<Record<LoginFieldName, string>>;

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export function LoginForm({ returnTo }: LoginFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(formData.get('email') ?? '').trim(),
      password: String(formData.get('password') ?? ''),
    });

    setFormError(null);

    if (!parsed.success) {
      setErrors(resolveFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await clientApi.login(parsed.data);
      router.push(returnTo as Route);
      router.refresh();
    } catch (error) {
      setFormError(resolveErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-foreground text-[22px] leading-8 font-medium">Welcome to TicketRush</h2>

      <form className="mt-4 flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <FormField label="Email" error={errors.email} htmlFor="login-email">
          <Input
            id="login-email"
            name="email"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
        </FormField>

        <FormField label="Password" error={errors.password} htmlFor="login-password">
          <Input
            id="login-password"
            name="password"
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
          />
        </FormField>

        {formError ? (
          <p className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm leading-5">
            {formError}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in' : 'Log in'}
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-4">
        <div className="text-muted-foreground flex items-center gap-3 text-xs leading-4">
          <span className="bg-border h-px flex-1" />
          <span>or</span>
          <span className="bg-border h-px flex-1" />
        </div>
        <Link
          className={cn(buttonVariants({ className: 'w-full', variant: 'outline' }))}
          href={`/register?${new URLSearchParams({ returnTo }).toString()}` as Route}
        >
          Create a new account
        </Link>
      </div>
    </div>
  );
}

function FormField({
  children,
  error,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5" data-invalid={Boolean(error) || undefined}>
      <label className="text-muted-foreground text-xs leading-5 font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-destructive text-sm leading-5" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function resolveFieldErrors(error: z.ZodError): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (field === 'email' || field === 'password') {
      errors[field] = issue.message;
    }
  }

  return errors;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Unable to log in right now. Please try again.';
}
