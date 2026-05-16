import { Button } from '@repo/design-system/components/ui/button';
import Link from 'next/link';

import { SiteFooter } from '../../_components/site-footer';
import { SiteHeader } from '../../_components/site-header';

export default function EventNotFound() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader query="" />
      <main className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-6 py-20">
        <section className="w-full max-w-md text-center">
          <p className="text-muted-foreground text-sm leading-5 font-medium">TicketRush</p>
          <h1 className="mt-3 text-2xl leading-8 font-semibold tracking-normal">Event not found</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            The event may be unpublished or the link may be outdated.
          </p>
          <Button className="mt-6" render={<Link href="/" />}>
            Back to events
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
