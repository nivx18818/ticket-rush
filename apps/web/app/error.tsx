'use client';

import { RefreshIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@repo/design-system/components/ui/button';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md text-center">
        <p className="text-muted-foreground text-sm font-medium">TicketRush</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal">Events could not load</h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {error.message || 'Check the API connection and try again.'}
        </p>
        <Button className="mt-6 rounded-full" onClick={reset}>
          <HugeiconsIcon data-icon="inline-start" icon={RefreshIcon} strokeWidth={2} />
          Try again
        </Button>
      </section>
    </main>
  );
}
