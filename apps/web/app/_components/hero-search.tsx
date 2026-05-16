'use client';

import type { Route } from 'next';
import type { FormEvent } from 'react';

import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

type HeroSearchProps = {
  query: string;
};

export function HeroSearch({ query }: HeroSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    const nextQuery = value.trim();

    if (nextQuery === query) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        router.replace(buildSearchUrl(nextQuery), { scroll: false });
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [query, router, value]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(() => {
      router.replace(buildSearchUrl(value.trim()), { scroll: false });
    });
  }

  return (
    <section className="pt-10 pb-10 text-center">
      <h1 className="text-foreground text-[28px] leading-[1.2] font-bold tracking-normal">
        Find your next unforgettable night
      </h1>
      <p className="text-muted-foreground mt-2 text-base">
        Concerts, festivals, theater, and more - book in seconds.
      </p>

      <form
        className="border-border bg-background mx-auto mt-8 hidden h-16 max-w-215 items-center rounded-full border shadow-sm md:flex"
        role="search"
        onSubmit={handleSubmit}
      >
        <div className="flex-1 px-6 py-2 text-left">
          <label
            className="text-foreground block text-[11px] leading-normal font-bold tracking-[0.32px] uppercase"
            htmlFor="hero-event-search"
          >
            What
          </label>
          <input
            id="hero-event-search"
            className="text-foreground placeholder:text-foreground/50 w-full bg-transparent text-sm outline-none"
            placeholder="Search events or artists"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <div className="bg-border h-8 w-px" />
        <div className="flex-1 px-6 py-2 text-left">
          <span className="text-foreground block text-[11px] leading-normal font-bold tracking-[0.32px] uppercase">
            Where
          </span>
          <span className="text-muted-foreground block text-sm">Anywhere</span>
        </div>
        <div className="bg-border h-8 w-px" />
        <div className="flex-1 px-6 py-2 text-left">
          <span className="text-foreground block text-[11px] leading-normal font-bold tracking-[0.32px] uppercase">
            When
          </span>
          <span className="text-muted-foreground block text-sm">Any week</span>
        </div>
        <div className="pr-2">
          <button
            className="bg-primary text-primary-foreground flex h-12 items-center gap-2 rounded-full px-5 text-sm font-medium"
            type="submit"
          >
            <HugeiconsIcon className="size-4" icon={Search01Icon} strokeWidth={2} />
            Search
          </button>
        </div>
      </form>

      <form
        className="border-border mt-6 flex h-12 items-center gap-2 rounded-full border px-4 md:hidden"
        role="search"
        onSubmit={handleSubmit}
      >
        <HugeiconsIcon
          className="text-muted-foreground size-4"
          icon={Search01Icon}
          strokeWidth={2}
        />
        <label className="sr-only" htmlFor="mobile-event-search">
          Search events
        </label>
        <input
          id="mobile-event-search"
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Search events"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </form>
    </section>
  );
}

function buildSearchUrl(query: string): Route {
  if (!query) {
    return '/';
  }

  const params = new URLSearchParams({ q: query });

  return `/?${params.toString()}` as Route;
}
