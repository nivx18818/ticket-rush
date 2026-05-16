import type { Event } from '@/lib/api/schemas';

import { EventCard } from './event-card';
import { HeroSearch } from './hero-search';

type EventGridProps = {
  events: Event[];
  query: string;
};

export function EventGrid({ events, query }: EventGridProps) {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12">
      <HeroSearch query={query} />

      <section className="pb-16" aria-labelledby="event-results-heading">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b pb-4">
          <h2
            id="event-results-heading"
            className="text-foreground text-xl leading-7 font-semibold"
          >
            Published events
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
