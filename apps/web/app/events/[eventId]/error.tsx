'use client';

import { RefreshIcon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@repo/design-system/components/ui/button';
import Link from 'next/link';

type EventDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function EventDetailError({ error, reset }: EventDetailErrorProps) {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md text-center">
        <div className="text-primary bg-accent mx-auto flex size-12 items-center justify-center rounded-full">
          <HugeiconsIcon className="size-6" icon={Ticket01Icon} strokeWidth={2.4} />
        </div>
        <h1 className="mt-5 text-2xl leading-8 font-semibold tracking-normal">
          Event details could not load
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-6">
          {error.message || 'Check the API connection and try again.'}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>
            <HugeiconsIcon data-icon="inline-start" icon={RefreshIcon} strokeWidth={2} />
            Try again
          </Button>
          <Button variant="outline" render={<Link href="/" />}>
            Back to events
          </Button>
        </div>
      </section>
    </main>
  );
}
