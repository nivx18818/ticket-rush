import { serverApi } from '@/lib/api/server';
import { getCurrentUserOrNull } from '@/lib/auth';

import { EventGrid } from './_components/event-grid';
import { SiteFooter } from './_components/site-footer';
import { SiteHeader } from './_components/site-header';

type HomePageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const query = normalizeSearchQuery((await searchParams).q);
  const [events, currentUser] = await Promise.all([
    serverApi.listEvents(query ? { q: query } : undefined),
    getCurrentUserOrNull(),
  ]);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader currentUser={currentUser} query={query} />
      <main>
        <EventGrid events={events} query={query} />
      </main>
      <SiteFooter />
    </div>
  );
}

function normalizeSearchQuery(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue?.trim() ?? '';
}
