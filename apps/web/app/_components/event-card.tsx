import { Calendar02Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Image from 'next/image';

import type { Event } from '@/lib/api/schemas';

type EventCardProps = {
  event: Event;
  priority?: boolean;
};

export function EventCard({ event, priority = false }: EventCardProps) {
  const eventDate = formatEventDate(event.eventDate);

  return (
    <article className="group">
      <div className="bg-muted relative aspect-square overflow-hidden rounded-[14px]">
        <a
          className="relative block h-full w-full"
          href={`/events/${event.id}`}
          aria-label={`View ${event.name}`}
        >
          <Image
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            src={event.thumbnailUrl}
            alt={event.name}
            fill
            sizes="(min-width: 1536px) 16vw, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            loading={priority ? 'eager' : 'lazy'}
            unoptimized
          />
        </a>
      </div>

      <div className="space-y-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <a
            className="text-foreground line-clamp-1 text-base leading-6 font-semibold"
            href={`/events/${event.id}`}
          >
            {event.name}
          </a>
        </div>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm leading-5">
          <HugeiconsIcon className="size-3.5 shrink-0" icon={Location01Icon} strokeWidth={2} />
          <span className="line-clamp-1">{event.venue}</span>
        </p>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm leading-5">
          <HugeiconsIcon className="size-3.5 shrink-0" icon={Calendar02Icon} strokeWidth={2} />
          <span>{eventDate}</span>
        </p>
        <p className="text-foreground pt-1 text-sm leading-5">
          <span className="font-semibold">Tickets</span>
          <span className="text-muted-foreground"> available now</span>
        </p>
      </div>
    </article>
  );
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
