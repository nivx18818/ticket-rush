import { ApiError } from '@/lib/api';

export type CheckoutStatus =
  | 'canceling'
  | 'confirming'
  | 'creating-order'
  | 'error'
  | 'expired'
  | 'locking'
  | 'ready';

export function resolveStatusMessage(
  status: CheckoutStatus,
  remainingSeconds: number | null,
): string {
  if (status === 'locking') {
    return 'Preparing your seat hold. This usually takes a few seconds.';
  }

  if (status === 'creating-order') {
    return 'Your seats are held. Creating your order summary now.';
  }

  if (status === 'confirming') {
    return 'Confirming payment and issuing your tickets.';
  }

  if (status === 'canceling') {
    return 'Canceling the order and releasing your seats.';
  }

  if (status === 'expired') {
    return 'Your seat hold expired. Return to the event page to choose seats again.';
  }

  return `Your seats are held for ${formatDuration(remainingSeconds)}. Complete payment before time runs out or the seats will be released.`;
}

export function buildSelectionIssueMessage(
  missingSeatCount: number,
  unavailableSeatCount: number,
): string {
  const messages: string[] = [];

  if (missingSeatCount > 0) {
    messages.push(
      `${missingSeatCount} selected seat ${missingSeatCount === 1 ? 'is' : 'are'} missing`,
    );
  }

  if (unavailableSeatCount > 0) {
    messages.push(
      `${unavailableSeatCount} selected seat ${unavailableSeatCount === 1 ? 'is' : 'are'} no longer available`,
    );
  }

  return `${messages.join(' and ')}. Return to the event page to adjust your selection.`;
}

export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) {
    return '10:00';
  }

  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  return `${minutes}:${seconds}`;
}

export function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Unable to continue checkout right now. Please try again.';
}
