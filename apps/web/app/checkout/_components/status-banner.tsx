import { Shield01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@repo/design-system/lib/utils';

import type { CheckoutStatus } from '../_utils/checkout-helpers';

import { resolveStatusMessage } from '../_utils/checkout-helpers';

type StatusBannerProps = {
  conflictMessage: string | null;
  errorMessage: string | null;
  remainingSeconds: number | null;
  status: CheckoutStatus;
};

export function StatusBanner({
  conflictMessage,
  errorMessage,
  remainingSeconds,
  status,
}: StatusBannerProps) {
  const message = conflictMessage ?? errorMessage ?? resolveStatusMessage(status, remainingSeconds);
  const isPositive = status === 'ready' && !conflictMessage && !errorMessage;

  return (
    <div
      className={cn(
        'mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm leading-5 transition-[opacity,transform] duration-200',
        isPositive
          ? 'border-seat-available/30 bg-seat-available/10 text-foreground'
          : 'border-destructive/20 bg-destructive/5 text-destructive',
      )}
      role={isPositive ? 'status' : 'alert'}
    >
      <HugeiconsIcon className="mt-0.5 shrink-0" icon={Shield01Icon} strokeWidth={2} />
      <p>{message}</p>
    </div>
  );
}
