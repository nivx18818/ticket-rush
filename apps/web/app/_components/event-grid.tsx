import Link from 'next/link';

import type { Event } from '@/lib/api/schemas';

import { EventCard } from './event-card';
import { HeroSearch } from './hero-search';

type EventGridProps = {
  events: Event[];
  query: string;
};

const CATEGORY_LINKS = [
  { href: '/', label: 'All events' },
  { href: '/?q=concert', label: 'Concerts' },
  { href: '/?q=festival', label: 'Festivals' },
  { href: '/?q=theater', label: 'Theater' },
  { href: '/?q=comedy', label: 'Comedy' },
  { href: '/?q=sports', label: 'Sports' },
] as const;

export function EventGrid({ events, query }: EventGridProps) {
  return (
    <div className="mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-8 2xl:px-12">
      <HeroSearch query={query} />

      <nav
        className="border-border -mx-4 mb-8 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0"
        aria-label="Event categories"
      >
        <div className="flex min-w-max items-center gap-8">
          {CATEGORY_LINKS.map((category) => {
            const isActive =
              !query && category.href === '/' ? true : category.href.endsWith(`q=${query}`);

            return (
              <Link
                key={category.label}
                className={
                  isActive
                    ? 'text-foreground border-foreground border-b-2 py-4 text-sm leading-5 font-semibold'
                    : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent py-4 text-sm leading-5 font-medium'
                }
                href={category.href}
              >
                {category.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <section className="pb-16" aria-labelledby="event-results-heading">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b pb-4">
          <h2
            id="event-results-heading"
            className="text-foreground text-xl leading-7 font-semibold tracking-normal"
          >
            Events to book
          </h2>
          <p className="text-muted-foreground text-sm leading-5">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        {events.length === 0 ? (
          <div className="text-muted-foreground py-24 text-center text-base">
            No events found{query ? ` for "${query}"` : ''}.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),1fr))] gap-x-6 gap-y-10">
            {events.map((event, index) => (
              <EventCard key={event.id} priority={index < 4} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
