import type { Route } from 'next';

import { redirect } from 'next/navigation';

import { getCurrentUserOrNull } from '@/lib/auth';
import { sanitizeAuthReturnTo } from '@/lib/return-to';

import { AuthPanel } from '../_components/auth-panel';
import { SiteHeader } from '../_components/site-header';
import { RegisterForm } from './_components/register-form';

type RegisterPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const returnTo = sanitizeAuthReturnTo((await searchParams).returnTo);
  const currentUser = await getCurrentUserOrNull();

  if (currentUser) {
    redirect(returnTo as Route);
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader query="" />
      <AuthPanel title="Sign up">
        <RegisterForm returnTo={returnTo} />
      </AuthPanel>
    </div>
  );
}
