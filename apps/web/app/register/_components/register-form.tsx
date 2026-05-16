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

import { ApiError, userGenderSchema, type UserGender } from '@/lib/api';
import { clientApi } from '@/lib/api/client';

type RegisterFormProps = {
  returnTo: string;
};

type RegisterFieldName = 'dateOfBirth' | 'email' | 'gender' | 'name' | 'password';
type RegisterFieldErrors = Partial<Record<RegisterFieldName, string>>;

const registerSchema = z.object({
  dateOfBirth: z
    .string()
    .min(1, 'Enter your date of birth.')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date of birth.')
    .refine((value) => new Date(value) <= new Date(), 'Date of birth must be in the past.'),
  email: z.email('Enter a valid email address.'),
  gender: userGenderSchema,
  name: z.string().trim().min(2, 'Enter your full name.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/\d/, 'Password must include a number.'),
});

const GENDER_OPTIONS: { label: string; value: UserGender }[] = [
  { label: 'Female', value: 'FEMALE' },
  { label: 'Male', value: 'MALE' },
  { label: 'Other', value: 'OTHER' },
];

export function RegisterForm({ returnTo }: RegisterFormProps) {
  const router = useRouter();
  const [gender, setGender] = useState<UserGender>('FEMALE');
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      dateOfBirth: String(formData.get('dateOfBirth') ?? ''),
      email: String(formData.get('email') ?? '').trim(),
      gender,
      name: String(formData.get('name') ?? ''),
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
      await clientApi.register(parsed.data);
      await clientApi.login({
        email: parsed.data.email,
        password: parsed.data.password,
      });
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
        <FormField label="Full name" error={errors.name} htmlFor="register-name">
          <Input
            id="register-name"
            name="name"
            placeholder="Your name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
          />
        </FormField>

        <FormField label="Email" error={errors.email} htmlFor="register-email">
          <Input
            id="register-email"
            name="email"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
        </FormField>

        <FormField label="Password" error={errors.password} htmlFor="register-password">
          <Input
            id="register-password"
            name="password"
            placeholder="Password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
          />
        </FormField>

        <FormField label="Date of birth" error={errors.dateOfBirth} htmlFor="register-dob">
          <Input
            id="register-dob"
            name="dateOfBirth"
            type="date"
            autoComplete="bday"
            aria-invalid={Boolean(errors.dateOfBirth)}
          />
        </FormField>

        <fieldset
          className="flex flex-col gap-2"
          data-invalid={Boolean(errors.gender) || undefined}
        >
          <legend className="text-muted-foreground text-xs leading-5 font-medium">Gender</legend>
          <div className="border-border grid grid-cols-3 overflow-hidden rounded-lg border">
            {GENDER_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'text-foreground flex h-12 cursor-pointer items-center justify-center border-r text-sm font-medium last:border-r-0',
                  gender === option.value && 'bg-foreground text-background',
                )}
              >
                <input
                  name="gender"
                  className="sr-only"
                  type="radio"
                  value={option.value}
                  checked={gender === option.value}
                  onChange={() => setGender(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
          {errors.gender ? (
            <p className="text-destructive text-sm leading-5" role="alert">
              {errors.gender}
            </p>
          ) : null}
        </fieldset>

        {formError ? (
          <p className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm leading-5">
            {formError}
          </p>
        ) : null}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account' : 'Create account'}
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
          href={`/login?${new URLSearchParams({ returnTo }).toString()}` as Route}
        >
          I already have an account
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

function resolveFieldErrors(error: z.ZodError): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      field === 'dateOfBirth' ||
      field === 'email' ||
      field === 'gender' ||
      field === 'name' ||
      field === 'password'
    ) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Unable to create the account right now. Please try again.';
}
