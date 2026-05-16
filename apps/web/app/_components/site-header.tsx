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
      <div className="flex h-20 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 2xl:px-12">
        <Link className="text-primary flex shrink-0 items-center gap-2" href="/">
          <HugeiconsIcon className="size-6" icon={Ticket01Icon} strokeWidth={2.4} />
          <span className="text-xl font-bold tracking-normal">TicketRush</span>
        </Link>

        <HeaderSearch query={query} />

        <nav className="flex shrink-0 items-center gap-1">
          {currentUser ? (
            <>
              {currentUser.role === 'ADMIN' ? (
                <Link
                  className="text-foreground hover:bg-muted hidden h-9 items-center rounded-full px-4 text-sm font-semibold lg:inline-flex"
                  href="/"
                >
                  Dashboard
                </Link>
              ) : null}
              <Link
                className="text-foreground hover:bg-muted hidden h-9 items-center rounded-full px-4 text-sm font-semibold sm:inline-flex"
                href="/account/tickets"
              >
                My Tickets
              </Link>
              <LogoutButton />
            </>
          ) : (
            <a
              className="text-foreground hover:bg-muted hidden h-9 items-center rounded-full px-4 text-sm font-semibold sm:inline-flex"
              href="/login"
            >
              Log in
            </a>
          )}
          <button
            className="text-muted-foreground hover:bg-muted flex size-10 items-center justify-center rounded-full"
            type="button"
            aria-label="Language"
          >
            <HugeiconsIcon className="size-4" icon={GlobeIcon} strokeWidth={2} />
          </button>
          <button
            className="border-border flex h-10 items-center gap-2 rounded-full border py-1 pr-1 pl-3"
            type="button"
            aria-label="Account menu"
          >
            <HugeiconsIcon className="size-4" icon={Menu01Icon} strokeWidth={2} />
            <span className="bg-foreground text-background flex size-7 items-center justify-center rounded-full">
              {currentUser ? (
                <span className="text-[11px] leading-none font-semibold" aria-hidden="true">
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <HugeiconsIcon className="size-3.5" icon={UserIcon} strokeWidth={2} />
              )}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
