import { Calendar02Icon, Location01Icon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { Event, Seat } from '@/lib/api';

import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api/server';
import { getCurrentUserOrNull } from '@/lib/auth';

import { SiteFooter } from '../../_components/site-footer';
import { SiteHeader } from '../../_components/site-header';
import {
  SeatSelectionExperience,
  type CurrentUserSummary,
} from './_components/seat-selection-experience';

type EventDetailPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = await params;

  if (!UUID_PATTERN.test(eventId)) {
    notFound();
  }

  const { currentUser, event, seats } = await getEventPageData(eventId);
  const availableSeatCount = seats.filter((seat) => seat.status === 'AVAILABLE').length;
  const lowestPrice = getLowestSeatPrice(seats);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader currentUser={currentUser} query="" />
      <main className="mx-auto w-full max-w-270 px-4 pb-20 sm:px-6 lg:px-10">
        <Link
          className="hover:bg-muted mt-6 inline-flex h-10 items-center rounded-full px-3 text-sm leading-5 font-medium"
          href="/"
        >
          Back to events
        </Link>

        <section className="mt-4" aria-labelledby="event-title">
          <h1 id="event-title" className="text-foreground text-[22px] leading-8 font-medium">
            {event.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm leading-5">
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-foreground flex items-center gap-1.5">
                <HugeiconsIcon className="size-4" icon={Ticket01Icon} strokeWidth={2} />
                {availableSeatCount} available
              </span>
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon className="size-4" icon={Location01Icon} strokeWidth={2} />
                {event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <HugeiconsIcon className="size-4" icon={Calendar02Icon} strokeWidth={2} />
                {formatEventDate(event.eventDate)}
              </span>
            </div>
            <p className="text-foreground font-medium">From {formatPrice(lowestPrice)}</p>
          </div>
        </section>

        <div className="bg-muted relative mt-6 aspect-1000/420 w-full overflow-hidden rounded-[14px]">
          <Image
            className="object-cover"
            src={event.thumbnailUrl}
            alt={event.name}
            fill
            sizes="(min-width: 1128px) 1080px, 100vw"
            priority
            unoptimized
          />
        </div>

        <div className="mt-10">
          <SeatSelectionExperience
            currentUser={currentUser}
            event={{
              description: event.description,
              eventDateIso: event.eventDate.toISOString(),
              id: event.id,
              name: event.name,
              venue: event.venue,
            }}
            initialSeats={seats}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function getEventPageData(eventId: string): Promise<{
  currentUser: CurrentUserSummary;
  event: Event;
  seats: Seat[];
}> {
  try {
    const [event, seats, currentUser] = await Promise.all([
      serverApi.getEvent(eventId),
      serverApi.listEventSeats(eventId),
      getCurrentUserOrNull(),
    ]);

    return {
      currentUser,
      event,
      seats,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

function getLowestSeatPrice(seats: Seat[]): number {
  if (seats.length === 0) {
    return 0;
  }

  return Math.min(...seats.map((seat) => seat.price));
}

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    weekday: 'short',
    year: 'numeric',
  }).format(date);
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}
