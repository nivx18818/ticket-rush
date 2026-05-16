import type { Route } from 'next';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api/server';
import { getCurrentUserOrNull, isAuthApiError } from '@/lib/auth';
import { buildLoginPath } from '@/lib/return-to';

import { TicketCard, type TicketEventSummary } from '../_components/ticket-card';
import { SiteFooter } from '../../../_components/site-footer';
import { SiteHeader } from '../../../_components/site-header';

type TicketDetailPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { ticketId } = await params;

  if (!UUID_PATTERN.test(ticketId)) {
    notFound();
  }

  const currentUser = await getCurrentUserOrNull();

  if (!currentUser) {
    redirect(buildLoginPath(`/account/tickets/${ticketId}`) as Route);
  }

  const { event, ticket } = await getTicketPageData(ticketId);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader currentUser={currentUser} query="" />
      <main className="mx-auto w-full max-w-270 px-4 py-10 sm:px-6 lg:px-10">
        <Link
          className="hover:bg-muted inline-flex h-10 items-center rounded-full px-3 text-sm leading-5 font-medium"
          href="/account/tickets"
        >
          Back to tickets
        </Link>
        <header className="mt-4">
          <h1 className="text-foreground text-[28px] leading-10 font-bold">Ticket details</h1>
          <p className="text-muted-foreground mt-2 text-base leading-6">
            Show this QR code at the venue entrance.
          </p>
        </header>
        <div className="mt-8">
          <TicketCard event={event} ticket={ticket} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function getTicketPageData(ticketId: string) {
  try {
    const ticket = await serverApi.getTicket(ticketId);
    const event = await getTicketEvent(ticket.eventId);

    return { event, ticket };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    if (isAuthApiError(error)) {
      redirect(buildLoginPath(`/account/tickets/${ticketId}`) as Route);
    }

    throw error;
  }
}

async function getTicketEvent(eventId: string): Promise<TicketEventSummary> {
  try {
    const event = await serverApi.getEvent(eventId);

    return {
      eventDateIso: event.eventDate.toISOString(),
      name: event.name,
      thumbnailUrl: event.thumbnailUrl,
      venue: event.venue,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        eventDateIso: new Date().toISOString(),
        name: 'TicketRush event',
        thumbnailUrl: '',
        venue: 'Venue details unavailable',
      };
    }

    throw error;
  }
}
