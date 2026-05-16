'use client';

import type { Route } from 'next';

import {
  ArrowLeft02Icon,
  CreditCardIcon,
  Shield01Icon,
  Ticket01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@repo/design-system/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Order, Seat, SeatUpdatedEvent } from '@/lib/api';

import { useSeatUpdates } from '@/hooks/use-seat-updates';
import { clientApi } from '@/lib/api/client';
import { formatEventDate, formatPrice, formatSeatLabel } from '@/lib/format';

import { useRemainingSeconds } from '../_hooks/use-remaining-seconds';
import {
  buildSelectionIssueMessage,
  resolveErrorMessage,
  type CheckoutStatus,
} from '../_utils/checkout-helpers';
import { PaymentField } from './payment-field';
import { StatusBanner } from './status-banner';

type CheckoutClientProps = {
  currentUserName: string;
  event: {
    eventDateIso: string;
    id: string;
    name: string;
    thumbnailUrl: string;
    venue: string;
  };
  missingSeatCount: number;
  selectedSeats: Seat[];
};

export function CheckoutClient({
  currentUserName,
  event,
  missingSeatCount,
  selectedSeats,
}: CheckoutClientProps) {
  const router = useRouter();
  const selectedSeatIds = useMemo(() => selectedSeats.map((seat) => seat.id), [selectedSeats]);
  const selectedSeatSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const unavailableSeats = selectedSeats.filter((seat) => seat.status !== 'AVAILABLE');
  const hasSelectionIssue = missingSeatCount > 0 || unavailableSeats.length > 0;
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>(
    hasSelectionIssue ? 'error' : 'locking',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasSelectionIssue
      ? buildSelectionIssueMessage(missingSeatCount, unavailableSeats.length)
      : null,
  );
  const [lockedSeatIds, setLockedSeatIds] = useState<string[]>([]);
  const [lockedUntilIso, setLockedUntilIso] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const startedRef = useRef(false);
  const expiredRef = useRef(false);
  const orderRef = useRef<Order | null>(null);
  const lockedSeatIdsRef = useRef<Set<string>>(new Set());
  const remainingSeconds = useRemainingSeconds(lockedUntilIso);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    lockedSeatIdsRef.current = new Set(lockedSeatIds);
  }, [lockedSeatIds]);

  const startCheckout = useCallback(async () => {
    setCheckoutStatus('locking');
    setErrorMessage(null);

    try {
      const lockedSeats = await clientApi.lockSeats(selectedSeatIds);

      setLockedSeatIds(lockedSeats.seats.map((seat) => seat.id));
      setLockedUntilIso(lockedSeats.lockedUntil.toISOString());
      setCheckoutStatus('creating-order');

      const pendingOrder = await clientApi.createOrder(selectedSeatIds);

      setOrder(pendingOrder);
      setCheckoutStatus('ready');
    } catch (error) {
      setCheckoutStatus('error');
      setErrorMessage(resolveErrorMessage(error));
    }
  }, [selectedSeatIds]);

  useEffect(() => {
    if (hasSelectionIssue || startedRef.current) {
      return;
    }

    startedRef.current = true;
    void startCheckout();
  }, [hasSelectionIssue, startCheckout]);

  const handleSeatUpdated = useCallback(
    (payload: SeatUpdatedEvent) => {
      if (!selectedSeatSet.has(payload.seatId)) {
        return;
      }

      if (payload.status === 'SOLD') {
        setConflictMessage(
          'One of your selected seats was sold. Return to the event page to choose another seat.',
        );
        return;
      }

      if (payload.status === 'AVAILABLE' && orderRef.current?.status === 'PENDING') {
        setConflictMessage(
          'Your seat hold was released. Return to the event page to choose seats again.',
        );
      }
    },
    [selectedSeatSet],
  );

  const realtime = useSeatUpdates({
    enabled: selectedSeatIds.length > 0,
    eventId: event.id,
    onSeatUpdatedAction: handleSeatUpdated,
  });

  const expireHold = useCallback(async () => {
    if (expiredRef.current) {
      return;
    }

    expiredRef.current = true;
    setCheckoutStatus('expired');
    setErrorMessage('Your seat hold expired. The selected seats have been released.');

    try {
      const pendingOrder = orderRef.current;

      if (pendingOrder?.status === 'PENDING') {
        await clientApi.cancelOrder(pendingOrder.id);
      } else if (lockedSeatIdsRef.current.size > 0) {
        await clientApi.releaseSeats(Array.from(lockedSeatIdsRef.current));
      }
    } catch {
      // The hold may already have been released by the API expiry job.
    }
  }, []);

  useEffect(() => {
    if (remainingSeconds !== 0 || checkoutStatus !== 'ready') {
      return;
    }

    void expireHold();
  }, [checkoutStatus, expireHold, remainingSeconds]);

  async function handleConfirm() {
    if (!order || conflictMessage || checkoutStatus !== 'ready') {
      return;
    }

    setCheckoutStatus('confirming');
    setErrorMessage(null);

    try {
      await clientApi.confirmOrder(order.id);
      router.push('/account/tickets?confirmed=1' as Route);
      router.refresh();
    } catch (error) {
      setCheckoutStatus('error');
      setErrorMessage(resolveErrorMessage(error));
    }
  }

  async function handleCancel() {
    setCheckoutStatus('canceling');
    setErrorMessage(null);

    try {
      if (order?.status === 'PENDING') {
        await clientApi.cancelOrder(order.id);
      } else if (lockedSeatIds.length > 0) {
        await clientApi.releaseSeats(lockedSeatIds);
      }

      router.push(`/events/${event.id}` as Route);
      router.refresh();
    } catch (error) {
      setCheckoutStatus('error');
      setErrorMessage(resolveErrorMessage(error));
    }
  }

  const isBusy = ['canceling', 'confirming', 'creating-order', 'locking'].includes(checkoutStatus);
  const canConfirm = checkoutStatus === 'ready' && Boolean(order) && !conflictMessage;

  return (
    <main className="mx-auto w-full max-w-270 px-4 pb-20 sm:px-6 lg:px-10">
      <a
        className="hover:bg-muted mt-6 inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm leading-5 font-medium"
        href={`/events/${event.id}`}
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
        Back
      </a>

      <div className="mt-4">
        <h1 className="text-foreground text-[28px] leading-10 font-bold">Confirm and pay</h1>
        <StatusBanner
          conflictMessage={conflictMessage}
          errorMessage={errorMessage}
          remainingSeconds={remainingSeconds}
          status={checkoutStatus}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-12">
          <section
            className="border-border rounded-[14px] border p-5 sm:p-6"
            aria-labelledby="payment-heading"
          >
            <h2
              id="payment-heading"
              className="text-foreground text-[21px] leading-8 font-semibold"
            >
              Payment method
            </h2>

            <div className="border-foreground mt-4 flex min-h-14 items-center justify-between gap-4 rounded-lg border px-4">
              <div className="flex items-center gap-3">
                <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />
                <span className="text-base leading-6">Mock card - **** 4242</span>
              </div>
              <span className="text-muted-foreground text-xs leading-5">Demo only</span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <PaymentField label="Card number" value="4242 4242 4242 4242" />
              <PaymentField label="Cardholder name" value={currentUserName} />
              <PaymentField label="Expiry" value="12 / 30" />
              <PaymentField label="CVC" value="123" />
            </div>
          </section>

          <section aria-labelledby="cancellation-heading">
            <h2
              id="cancellation-heading"
              className="text-foreground text-[21px] leading-8 font-semibold"
            >
              Cancellation policy
            </h2>
            <p className="text-muted-foreground mt-3 text-base leading-6">
              Tickets are non-refundable. The seat hold expires automatically after 10 minutes if
              payment is not completed, and seats are released back to other guests.
            </p>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              type="button"
              disabled={!canConfirm || isBusy}
              onClick={handleConfirm}
            >
              <HugeiconsIcon data-icon="inline-start" icon={Shield01Icon} strokeWidth={2} />
              {checkoutStatus === 'confirming'
                ? 'Confirming payment'
                : `Confirm and pay - ${formatPrice(total)}`}
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              type="button"
              disabled={checkoutStatus === 'canceling' || checkoutStatus === 'confirming'}
              onClick={handleCancel}
            >
              {checkoutStatus === 'canceling' ? 'Canceling' : 'Cancel order'}
            </Button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28">
          <div className="border-border rounded-[14px] border p-6 shadow-xs">
            <div className="flex gap-3">
              <div className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-lg">
                {event.thumbnailUrl ? (
                  <Image
                    className="object-cover"
                    src={event.thumbnailUrl}
                    alt={event.name}
                    fill
                    sizes="96px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <HugeiconsIcon
                      className="text-muted-foreground"
                      icon={Ticket01Icon}
                      strokeWidth={2}
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-foreground line-clamp-2 text-sm leading-5 font-semibold">
                  {event.name}
                </h2>
                <p className="text-muted-foreground mt-1 line-clamp-1 text-[13px] leading-5">
                  {event.venue}
                </p>
                <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                  {formatEventDate(event.eventDateIso)}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4">
              <h3 className="text-foreground text-base leading-6 font-semibold">Price details</h3>
              <div className="flex flex-col gap-3">
                {selectedSeats.map((seat) => (
                  <div key={seat.id} className="flex justify-between gap-4 text-sm leading-5">
                    <span className="text-muted-foreground">{formatSeatLabel(seat)}</span>
                    <span className="text-foreground shrink-0">{formatPrice(seat.price)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between gap-4 text-sm leading-5">
                <span className="text-muted-foreground underline underline-offset-2">
                  Service fee
                </span>
                <span className="text-foreground">$0</span>
              </div>
              <div className="border-border flex justify-between gap-4 border-t pt-4 text-base leading-6 font-semibold">
                <span>Total (USD)</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <p className="text-muted-foreground mt-6 text-xs leading-4">
              Live updates {realtime.isConnected ? 'connected' : 'connecting'}.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
