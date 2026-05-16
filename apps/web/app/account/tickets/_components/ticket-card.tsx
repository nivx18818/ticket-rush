import {
  Calendar02Icon,
  Download01Icon,
  Location01Icon,
  Ticket01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { buttonVariants } from '@repo/design-system/components/ui/button';
import { cn } from '@repo/design-system/lib/utils';
import Image from 'next/image';

import type { Ticket } from '@/lib/api';

import { formatEventDate, formatSeatLabel, formatShortId } from '@/lib/format';

export type TicketEventSummary = {
  eventDateIso: string;
  name: string;
  thumbnailUrl: string;
  venue: string;
};

type TicketCardProps = {
  detailsHref?: string;
  event: TicketEventSummary;
  ticket: Ticket;
};

export function TicketCard({ detailsHref, event, ticket }: TicketCardProps) {
  return (
    <article className="border-border bg-background rounded-[14px] border p-4 shadow-xs sm:p-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
          <div className="bg-muted relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-lg sm:size-30">
            {event.thumbnailUrl ? (
              <Image
                className="object-cover"
                src={event.thumbnailUrl}
                alt={event.name}
                fill
                sizes="(min-width: 640px) 120px, 100vw"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <HugeiconsIcon className="text-muted-foreground" icon={Ticket01Icon} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-foreground line-clamp-2 text-lg leading-7 font-semibold">
              {event.name}
            </h2>
            <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm leading-5">
              <HugeiconsIcon className="size-4 shrink-0" icon={Calendar02Icon} strokeWidth={2} />
              <span>{formatEventDate(event.eventDateIso)}</span>
            </p>
            <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm leading-5">
              <HugeiconsIcon className="size-4 shrink-0" icon={Location01Icon} strokeWidth={2} />
              <span className="line-clamp-1">{event.venue}</span>
            </p>
            <p className="bg-muted text-foreground mt-4 inline-flex rounded-full px-3 py-1 text-xs leading-5 font-semibold">
              {formatSeatLabel(ticket.seat)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Image
            className="rounded-lg border"
            src={ticket.qrCode}
            alt={`QR code for ticket ${ticket.id}`}
            width={176}
            height={176}
            unoptimized
          />
          <p className="text-muted-foreground text-xs leading-4">ID: {formatShortId(ticket.id)}</p>
          <div className="flex w-full flex-wrap justify-center gap-2">
            {detailsHref ? (
              <a
                className={cn(buttonVariants({ className: 'w-full sm:w-auto', size: 'sm' }))}
                href={detailsHref}
              >
                View details
              </a>
            ) : null}
            <a
              className={cn(
                buttonVariants({ className: 'w-full sm:w-auto', size: 'sm', variant: 'outline' }),
              )}
              href={ticket.qrCode}
              download={`ticket-${ticket.id}.png`}
            >
              <HugeiconsIcon data-icon="inline-start" icon={Download01Icon} strokeWidth={2} />
              Download
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
