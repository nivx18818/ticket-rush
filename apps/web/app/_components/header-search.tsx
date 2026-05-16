'use client';

import type { Route } from 'next';
import type { FormEvent } from 'react';

import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

type HeaderSearchProps = {
  query: string;
};

export function HeaderSearch({ query }: HeaderSearchProps) {
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
    <form
      className="border-border bg-background hidden h-12 max-w-120 min-w-0 flex-1 items-center rounded-full border px-2 shadow-xs md:flex"
      role="search"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="header-event-search">
        Search events
      </label>
      <input
        id="header-event-search"
        className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent px-4 text-sm outline-none"
        placeholder="Search events, artists, venues..."
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex size-8 shrink-0 items-center justify-center rounded-full transition-colors"
        type="submit"
        aria-label="Search"
      >
        <HugeiconsIcon className="size-4" icon={Search01Icon} strokeWidth={2} />
      </button>
    </form>
  );
}

function buildSearchUrl(query: string): Route {
  if (!query) {
    return '/';
  }

  const params = new URLSearchParams({ q: query });

  return `/?${params.toString()}` as Route;
}
