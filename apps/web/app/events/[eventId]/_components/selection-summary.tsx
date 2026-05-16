'use client';

import { Calendar02Icon, Location01Icon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { buttonVariants } from '@repo/design-system/components/ui/button';
import { cn } from '@repo/design-system/lib/utils';

import type { SeatSocketStatus } from '@/hooks/use-seat-updates';
import type { Seat } from '@/lib/api';

import { ZONE_LAYOUT, ZONE_ORDER } from '@/config/zone-layout';

type EventSelectionDetails = {
  eventDateIso: string;
  id: string;
  name: string;
  venue: string;
};

type SelectionSummaryProps = {
  checkoutHref: string;
  currentUserName: string | null;
  event: EventSelectionDetails;
  lowestPrice: number;
  maxSelection: number;
  onRequireLoginAction: () => void;
  realtimeStatus: SeatSocketStatus;
  selectedSeats: Seat[];
};

export function SelectionSummary({
  checkoutHref,
  currentUserName,
  event,
  lowestPrice,
  maxSelection,
  onRequireLoginAction,
  realtimeStatus,
  selectedSeats,
}: SelectionSummaryProps) {
  const hasSelectedSeats = selectedSeats.length > 0;
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const sortedSeats = sortSelectedSeats(selectedSeats);

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="border-border bg-background rounded-[14px] border p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-foreground text-xl leading-7 font-semibold">
              {hasSelectedSeats ? formatPrice(total) : `From ${formatPrice(lowestPrice)}`}
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-5">
              {hasSelectedSeats ? `${selectedSeats.length} selected` : 'Choose your seats'}
            </p>
          </div>
          <span className={cn('mt-1 size-3 rounded-full', getRealtimeStatusClass(realtimeStatus))}>
            <span className="sr-only">{getRealtimeStatusLabel(realtimeStatus)}</span>
          </span>
        </div>

        <div className="border-border mt-5 flex flex-col gap-3 border-t pt-5">
          <p className="text-foreground line-clamp-2 text-sm leading-5 font-semibold">
            {event.name}
          </p>
          <p className="text-muted-foreground flex items-center gap-2 text-sm leading-5">
            <HugeiconsIcon className="size-4 shrink-0" icon={Calendar02Icon} strokeWidth={2} />
            <span>{formatEventDate(event.eventDateIso)}</span>
          </p>
          <p className="text-muted-foreground flex items-center gap-2 text-sm leading-5">
            <HugeiconsIcon className="size-4 shrink-0" icon={Location01Icon} strokeWidth={2} />
            <span className="line-clamp-1">{event.venue}</span>
          </p>
        </div>

        <div className="border-border mt-5 border-t pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-foreground text-base leading-6 font-semibold">Seat summary</h3>
            <p className="text-muted-foreground text-sm leading-5">
              {selectedSeats.length}/{maxSelection}
            </p>
          </div>

          {hasSelectedSeats ? (
            <div className="flex flex-col gap-3">
              {sortedSeats.map((seat) => (
                <div key={seat.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-foreground leading-5 font-medium">
                      {ZONE_LAYOUT[seat.zoneName].label}
                    </p>
                    <p className="text-muted-foreground leading-5">
                      Row {seat.rowLabel}, Seat {seat.seatNumber}
                    </p>
                  </div>
                  <span className="text-foreground shrink-0 leading-5 font-medium">
                    {formatPrice(seat.price)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground bg-muted flex items-start gap-3 rounded-lg p-4 text-sm leading-5">
              <HugeiconsIcon
                className="mt-0.5 size-4 shrink-0"
                icon={Ticket01Icon}
                strokeWidth={2}
              />
              <p>Pick available seats from the map. Locked or sold seats cannot be selected.</p>
            </div>
          )}
        </div>

        <div className="border-border mt-5 flex flex-col gap-4 border-t pt-5">
          <div className="flex justify-between gap-4 text-sm leading-5">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground font-medium">{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm leading-5">
            <span className="text-muted-foreground underline underline-offset-2">Service fee</span>
            <span className="text-foreground font-medium">{formatPrice(0)}</span>
          </div>
          <div className="flex justify-between gap-4 text-base leading-6 font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          {currentUserName ? (
            hasSelectedSeats ? (
              <a
                className={cn(buttonVariants({ className: 'w-full' }))}
                href={checkoutHref}
                aria-label="Proceed to checkout with selected seats"
              >
                Continue to checkout
              </a>
            ) : (
              <button
                className={cn(buttonVariants({ className: 'w-full' }))}
                type="button"
                disabled
              >
                Continue to checkout
              </button>
            )
          ) : (
            <button
              className={cn(buttonVariants({ className: 'w-full' }))}
              type="button"
              disabled={!hasSelectedSeats}
              onClick={onRequireLoginAction}
            >
              Continue to checkout
            </button>
          )}

          {currentUserName ? (
            <p className="text-muted-foreground text-center text-xs leading-4">
              Signed in as {currentUserName}.
            </p>
          ) : (
            <p className="text-muted-foreground text-center text-xs leading-4">
              Sign in to hold selected seats at checkout.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function sortSelectedSeats(seats: Seat[]): Seat[] {
  return seats.toSorted((seatA, seatB) => {
    const zoneDiff = ZONE_ORDER.indexOf(seatA.zoneName) - ZONE_ORDER.indexOf(seatB.zoneName);

    if (zoneDiff !== 0) {
      return zoneDiff;
    }

    const rowDiff = rowLabelToNumber(seatA.rowLabel) - rowLabelToNumber(seatB.rowLabel);

    return rowDiff || seatA.seatNumber - seatB.seatNumber;
  });
}

function rowLabelToNumber(rowLabel: string): number {
  return rowLabel
    .toUpperCase()
    .split('')
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

function getRealtimeStatusClass(status: SeatSocketStatus): string {
  if (status === 'connected') {
    return 'bg-seat-available';
  }

  if (status === 'connecting') {
    return 'bg-zone-vip';
  }

  return 'bg-seat-locked';
}

function getRealtimeStatusLabel(status: SeatSocketStatus): string {
  if (status === 'connected') {
    return 'Live seat updates connected';
  }

  if (status === 'connecting') {
    return 'Live seat updates connecting';
  }

  return 'Live seat updates disconnected';
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    weekday: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export type { EventSelectionDetails };
