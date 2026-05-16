import { GlobeIcon, Menu01Icon, Ticket01Icon, UserIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';

import type { UserProfile } from '@/lib/api';

import { HeaderSearch } from './header-search';
import { LogoutButton } from './logout-button';

type SiteHeaderProps = {
  currentUser?: Pick<UserProfile, 'name' | 'role'> | null;
  query: string;
};

export function SiteHeader({ currentUser = null, query }: SiteHeaderProps) {
  return (
    <header className="border-border bg-background sticky top-0 z-40 w-full border-b">
      <div className="flex min-h-20 w-full items-center justify-between gap-3 px-4 py-3 sm:px-6 md:gap-5 md:py-0 lg:px-8 2xl:px-12">
        <Link className="text-primary flex min-w-0 shrink-0 items-center gap-2" href="/">
          <HugeiconsIcon className="size-6" icon={Ticket01Icon} strokeWidth={2.4} />
          <span className="truncate text-xl leading-6 font-bold tracking-normal">TicketRush</span>
        </Link>

        <HeaderSearch query={query} />

        <nav className="flex min-w-0 shrink-0 items-center justify-end gap-1">
          {currentUser ? (
            <>
              {currentUser.role === 'ADMIN' ? (
                <Link
                  className="text-foreground hover:bg-muted hidden h-9 items-center rounded-full px-4 text-sm leading-5 font-semibold lg:inline-flex"
                  href="/"
                >
                  Dashboard
                </Link>
              ) : null}
              <Link
                className="text-foreground hover:bg-muted hidden h-9 items-center rounded-full px-4 text-sm leading-5 font-semibold sm:inline-flex"
                href="/account/tickets"
              >
                My Tickets
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                className="text-foreground hover:bg-muted hidden h-9 items-center rounded-full px-4 text-sm leading-5 font-semibold sm:inline-flex"
                href="/login"
              >
                Log in
              </Link>
              <Link
                className="bg-primary text-primary-foreground hover:bg-primary/90 hidden h-9 items-center rounded-full px-4 text-sm leading-5 font-semibold lg:inline-flex"
                href="/register"
              >
                Sign up
              </Link>
            </>
          )}
          <button
            className="text-muted-foreground hover:bg-muted hidden size-10 items-center justify-center rounded-full sm:flex"
            type="button"
            aria-label="Language"
          >
            <HugeiconsIcon className="size-4" icon={GlobeIcon} strokeWidth={2} />
          </button>
          <Link
            className="border-border flex h-10 min-w-10 items-center gap-2 rounded-full border py-1 pr-1 pl-3 transition-shadow hover:shadow-xs"
            href={currentUser ? '/account/tickets' : '/login'}
            aria-label={currentUser ? 'Open account tickets' : 'Log in'}
          >
            <HugeiconsIcon className="size-4 shrink-0" icon={Menu01Icon} strokeWidth={2} />
            {currentUser ? (
              <span className="text-foreground hidden max-w-24 truncate text-sm leading-5 font-medium xl:inline">
                {currentUser.name}
              </span>
            ) : null}
            <span className="bg-foreground text-background flex size-7 shrink-0 items-center justify-center rounded-full">
              {currentUser ? (
                <span className="text-[11px] leading-none font-semibold" aria-hidden="true">
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <HugeiconsIcon className="size-3.5" icon={UserIcon} strokeWidth={2} />
              )}
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
