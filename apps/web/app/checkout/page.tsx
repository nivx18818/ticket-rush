import type { Route } from 'next';

import Link from 'next/link';
import { redirect } from 'next/navigation';

import type { Event, Seat } from '@/lib/api';

import { ApiError } from '@/lib/api';
import { serverApi } from '@/lib/api/server';
import { getCurrentUserOrNull, isAuthApiError } from '@/lib/auth';
import { buildLoginPath } from '@/lib/return-to';

import { SiteFooter } from '../_components/site-footer';
import { SiteHeader } from '../_components/site-header';
import { CheckoutClient } from './_components/checkout-client';

type CheckoutPageProps = {
  searchParams: Promise<{
    eventId?: string | string[];
    seatIds?: string | string[];
  }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const parsedSearchParams = await searchParams;
  const eventId = normalizeSingleParam(parsedSearchParams.eventId);
  const seatIds = normalizeSeatIds(parsedSearchParams.seatIds);
  const returnTo = buildCheckoutReturnTo(eventId, seatIds);
  const currentUser = await getCurrentUserOrNull();

  if (!currentUser) {
    redirect(buildLoginPath(returnTo) as Route);
  }

  if (!eventId || !UUID_PATTERN.test(eventId) || seatIds.length === 0) {
    return (
      <CheckoutShell currentUser={currentUser}>
        <InvalidCheckoutState />
      </CheckoutShell>
    );
  }

  const { event, seats } = await getCheckoutData(eventId);
  const seatsById = new Map(seats.map((seat) => [seat.id, seat]));
  const selectedSeats = seatIds.flatMap((seatId) => {
    const seat = seatsById.get(seatId);

    return seat ? [seat] : [];
  });
  const missingSeatCount = seatIds.length - selectedSeats.length;

  return (
    <CheckoutShell currentUser={currentUser}>
      <CheckoutClient
        currentUserName={currentUser.name}
        event={{
          eventDateIso: event.eventDate.toISOString(),
          id: event.id,
          name: event.name,
          thumbnailUrl: event.thumbnailUrl,
          venue: event.venue,
        }}
        missingSeatCount={missingSeatCount}
        selectedSeats={selectedSeats}
      />
    </CheckoutShell>
  );
}

function CheckoutShell({
  children,
  currentUser,
}: {
  children: React.ReactNode;
  currentUser: NonNullable<Awaited<ReturnType<typeof getCurrentUserOrNull>>>;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader currentUser={currentUser} query="" />
      {children}
      <SiteFooter />
    </div>
  );
}

function InvalidCheckoutState() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-270 items-center px-4 py-12 sm:px-6 lg:px-10">
      <section className="border-border w-full rounded-[14px] border p-6">
        <h1 className="text-foreground text-[28px] leading-10 font-bold">Checkout unavailable</h1>
        <p className="text-muted-foreground mt-2 max-w-150 text-base leading-6">
          Choose available seats from an event page before continuing to checkout.
        </p>
        <Link
          className="bg-primary text-primary-foreground mt-6 inline-flex h-12 items-center rounded-lg px-6 text-base font-medium"
          href="/"
        >
          Browse events
        </Link>
      </section>
    </main>
  );
}

async function getCheckoutData(eventId: string): Promise<{
  event: Event;
  seats: Seat[];
}> {
  try {
    const [event, seats] = await Promise.all([
      serverApi.getEvent(eventId),
      serverApi.listEventSeats(eventId),
    ]);

    return { event, seats };
  } catch (error) {
    if (isAuthApiError(error)) {
      redirect(buildLoginPath(`/checkout?${new URLSearchParams({ eventId }).toString()}`) as Route);
    }

    if (error instanceof ApiError && error.status === 404) {
      return {
        event: {
          createdAt: new Date(),
          description: '',
          eventDate: new Date(),
          id: eventId,
          name: 'Event unavailable',
          status: 'PUBLISHED',
          thumbnailUrl: '',
          venue: '',
        },
        seats: [],
      };
    }

    throw error;
  }
}

function buildCheckoutReturnTo(eventId: string, seatIds: string[]): string {
  const params = new URLSearchParams();

  if (eventId) {
    params.set('eventId', eventId);
  }

  if (seatIds.length > 0) {
    params.set('seatIds', seatIds.join(','));
  }

  const serializedParams = params.toString();

  return serializedParams ? `/checkout?${serializedParams}` : '/checkout';
}

function normalizeSingleParam(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue?.trim() ?? '';
}

function normalizeSeatIds(value: string | string[] | undefined): string[] {
  const rawValues = Array.isArray(value) ? value : [value ?? ''];
  const ids = rawValues
    .flatMap((rawValue) => rawValue.split(','))
    .map((seatId) => seatId.trim())
    .filter((seatId) => UUID_PATTERN.test(seatId));

  return [...new Set(ids)].slice(0, 4);
}
