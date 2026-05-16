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
    <article className="border-border rounded-[14px] border p-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_9.75rem]">
        <div className="flex min-w-0 gap-4">
          <div className="bg-muted relative hidden size-30 shrink-0 overflow-hidden rounded-lg sm:block">
            {event.thumbnailUrl ? (
              <Image
                className="object-cover"
                src={event.thumbnailUrl}
                alt={event.name}
                fill
                sizes="120px"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <HugeiconsIcon className="text-muted-foreground" icon={Ticket01Icon} />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-foreground text-lg leading-7 font-semibold">{event.name}</h2>
            <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm leading-5">
              <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />
              <span>{formatEventDate(event.eventDateIso)}</span>
            </p>
            <p className="text-muted-foreground mt-2 flex items-center gap-2 text-sm leading-5">
              <HugeiconsIcon icon={Location01Icon} strokeWidth={2} />
              <span className="line-clamp-1">{event.venue}</span>
            </p>
            <p className="bg-muted text-foreground mt-4 inline-flex rounded-full px-3 py-1 text-xs leading-5 font-semibold">
              {formatSeatLabel(ticket.seat)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-center">
          <Image
            className="rounded-lg border"
            src={ticket.qrCode}
            alt={`QR code for ticket ${ticket.id}`}
            width={156}
            height={156}
            unoptimized
          />
          <p className="text-muted-foreground text-xs leading-4">ID: {formatShortId(ticket.id)}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {detailsHref ? (
              <a className={cn(buttonVariants({ size: 'sm' }))} href={detailsHref}>
                View details
              </a>
            ) : null}
            <a
              className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
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
