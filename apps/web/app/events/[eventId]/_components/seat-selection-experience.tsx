'use client';

import { useCallback, useMemo, useState } from 'react';

import type { Seat, SeatUpdatedEvent, UserRole } from '@/lib/api';

import { useSeatUpdates } from '@/hooks/use-seat-updates';

import { AuthRequiredDialog } from './auth-required-dialog';
import { SeatMap } from './seat-map';
import { SelectionSummary, type EventSelectionDetails } from './selection-summary';

type CurrentUserSummary = {
  email: string;
  id: string;
  name: string;
  role: UserRole;
} | null;

type SeatSelectionExperienceProps = {
  currentUser: CurrentUserSummary;
  event: EventSelectionDetails & {
    description: string;
  };
  initialSeats: Seat[];
};

const MAX_SELECTION = 4;

export function SeatSelectionExperience({
  currentUser,
  event,
  initialSeats,
}: SeatSelectionExperienceProps) {
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [seats, setSeats] = useState(initialSeats);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);

  const handleSeatUpdated = useCallback((payload: SeatUpdatedEvent) => {
    setSeats((currentSeats) =>
      currentSeats.map((seat) =>
        seat.id === payload.seatId ? { ...seat, status: payload.status } : seat,
      ),
    );

    if (payload.status !== 'AVAILABLE') {
      setSelectedSeatIds((currentIds) => currentIds.filter((seatId) => seatId !== payload.seatId));
    }
  }, []);

  const realtime = useSeatUpdates({
    eventId: event.id,
    onSeatUpdatedAction: handleSeatUpdated,
  });

  const selectedSeats = useMemo(() => {
    const selectedSeatSet = new Set(selectedSeatIds);

    return seats.filter((seat) => selectedSeatSet.has(seat.id));
  }, [seats, selectedSeatIds]);

  const lowestPrice = useMemo(() => getLowestSeatPrice(seats), [seats]);
  const checkoutHref = useMemo(
    () => buildCheckoutHref(event.id, selectedSeatIds),
    [event.id, selectedSeatIds],
  );

  const handleSeatToggle = useCallback(
    (seatId: string) => {
      const seat = seats.find((candidate) => candidate.id === seatId);
      const isSelected = selectedSeatIds.includes(seatId);

      if (!seat || (seat.status !== 'AVAILABLE' && !isSelected)) {
        return;
      }

      if (!isSelected && selectedSeatIds.length >= MAX_SELECTION) {
        setSelectionMessage(`Select up to ${MAX_SELECTION} seats per booking.`);
        return;
      }

      setSelectionMessage(null);
      setSelectedSeatIds((currentIds) =>
        isSelected ? currentIds.filter((id) => id !== seatId) : [...currentIds, seatId],
      );
    },
    [seats, selectedSeatIds],
  );

  const openLoginPrompt = useCallback(() => {
    setLoginPromptOpen(true);
  }, []);

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-14">
          <DetailSection title="About this event">
            <p className="text-muted-foreground text-base leading-7">{event.description}</p>
          </DetailSection>

          <DetailSection title="Event details">
            <div className="space-y-3 text-base leading-7">
              <p>{formatEventDate(event.eventDateIso)}</p>
              <p>{event.venue}</p>
            </div>
          </DetailSection>

          <section aria-labelledby="seat-selection-heading">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="seat-selection-heading"
                  className="text-foreground text-[21px] leading-8 font-semibold"
                >
                  Choose your seats
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-5">
                  Up to {MAX_SELECTION} seats per booking. Selected seats continue to checkout.
                </p>
              </div>
              <p className="border-border text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm leading-5">
                <span
                  className={
                    realtime.isConnected
                      ? 'bg-seat-available size-2 rounded-full'
                      : 'bg-zone-vip size-2 rounded-full'
                  }
                  aria-hidden="true"
                />
                {realtime.isConnected ? 'Live updates on' : 'Live updates connecting'}
              </p>
            </div>

            {selectionMessage ? (
              <p className="border-border bg-muted mb-4 rounded-lg border px-4 py-3 text-sm leading-5 transition-[opacity,transform] duration-200">
                {selectionMessage}
              </p>
            ) : null}

            <SeatMap
              maxSelection={MAX_SELECTION}
              onSeatToggleAction={handleSeatToggle}
              seats={seats}
              selectedSeatIds={selectedSeatIds}
            />
          </section>
        </div>

        <SelectionSummary
          maxSelection={MAX_SELECTION}
          checkoutHref={checkoutHref}
          currentUserName={currentUser?.name ?? null}
          event={event}
          lowestPrice={lowestPrice}
          onRequireLoginAction={openLoginPrompt}
          realtimeStatus={realtime.status}
          selectedSeats={selectedSeats}
        />
      </div>

      <AuthRequiredDialog
        eventId={event.id}
        returnTo={checkoutHref}
        open={loginPromptOpen}
        onOpenChangeAction={setLoginPromptOpen}
      />
    </>
  );
}

function DetailSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section aria-labelledby={`${slugify(title)}-heading`}>
      <h2
        id={`${slugify(title)}-heading`}
        className="text-foreground text-[21px] leading-8 font-semibold"
      >
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function buildCheckoutHref(eventId: string, seatIds: string[]): string {
  const params = new URLSearchParams({ eventId });

  if (seatIds.length > 0) {
    params.set('seatIds', seatIds.join(','));
  }

  return `/checkout?${params.toString()}`;
}

function getLowestSeatPrice(seats: Seat[]): number {
  if (seats.length === 0) {
    return 0;
  }

  return Math.min(...seats.map((seat) => seat.price));
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

export type { CurrentUserSummary, SeatSelectionExperienceProps };
