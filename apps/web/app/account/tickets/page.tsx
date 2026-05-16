import type { Route } from 'next';

import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { Ticket } from '@/lib/api';

import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api/server';
import { getCurrentUserOrNull, isAuthApiError } from '@/lib/auth';
import { buildLoginPath } from '@/lib/return-to';

import { SiteFooter } from '../../_components/site-footer';
import { SiteHeader } from '../../_components/site-header';
import { TicketCard, type TicketEventSummary } from './_components/ticket-card';

type TicketsPageProps = {
  searchParams: Promise<{
    confirmed?: string | string[];
  }>;
};

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  const currentUser = await getCurrentUserOrNull();

  if (!currentUser) {
    redirect(buildLoginPath('/account/tickets') as Route);
  }

  const confirmed = normalizeSingleParam((await searchParams).confirmed) === '1';
  const tickets = await serverApi.listTickets();
  const eventsById = await getEventsById(tickets);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader currentUser={currentUser} query="" />
      <main className="mx-auto w-full max-w-270 px-4 py-10 sm:px-6 lg:px-10">
        {confirmed ? (
          <div
            className="border-seat-available/30 bg-seat-available/10 mb-8 flex items-start gap-3 rounded-[14px] border px-4 py-4 transition-[opacity,transform] duration-200"
            role="status"
          >
            <HugeiconsIcon
              className="text-seat-available mt-0.5 shrink-0"
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
            />
            <div>
              <p className="text-foreground text-base leading-6 font-semibold">
                Booking confirmed!
              </p>
              <p className="text-muted-foreground text-sm leading-5">
                Your QR ticket is ready. Show it at the venue entrance.
              </p>
            </div>
          </div>
        ) : null}

        <header>
          <h1 className="text-foreground text-[28px] leading-10 font-bold">Your tickets</h1>
          <p className="text-muted-foreground mt-2 text-base leading-6">
            Present the QR code at the venue entrance. Each code encodes a unique ticket ID.
          </p>
        </header>

        {tickets.length === 0 ? (
          <section className="border-border mt-8 rounded-[14px] border px-6 py-12 text-center shadow-xs">
            <h2 className="text-foreground text-lg leading-7 font-semibold">No tickets yet</h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-120 text-sm leading-5">
              Book seats for an event and your issued tickets will appear here.
            </p>
            <Link
              className="bg-primary text-primary-foreground mt-6 inline-flex h-12 items-center rounded-lg px-6 text-base font-medium"
              href="/"
            >
              Browse events
            </Link>
          </section>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                detailsHref={`/account/tickets/${ticket.id}`}
                event={eventsById.get(ticket.eventId) ?? toFallbackEvent(ticket)}
                ticket={ticket}
              />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

async function getEventsById(tickets: Ticket[]): Promise<Map<string, TicketEventSummary>> {
  const eventIds = [...new Set(tickets.map((ticket) => ticket.eventId))];
  const events = await Promise.all(
    eventIds.map(async (eventId) => {
      try {
        return await serverApi.getEvent(eventId);
      } catch (error) {
        if (isAuthApiError(error) || (error instanceof ApiError && error.status === 404)) {
          return null;
        }

        throw error;
      }
    }),
  );

  return new Map(
    events.flatMap((event): [string, TicketEventSummary][] =>
      event
        ? [
            [
              event.id,
              {
                eventDateIso: event.eventDate.toISOString(),
                name: event.name,
                thumbnailUrl: event.thumbnailUrl,
                venue: event.venue,
              },
            ],
          ]
        : [],
    ),
  );
}

function toFallbackEvent(ticket: Ticket): TicketEventSummary {
  return {
    eventDateIso: ticket.issuedAt.toISOString(),
    name: 'TicketRush event',
    thumbnailUrl: '',
    venue: 'Venue details unavailable',
  };
}

function normalizeSingleParam(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue?.trim() ?? '';
}
