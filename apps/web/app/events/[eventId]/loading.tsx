import { SiteFooter } from '../../_components/site-footer';
import { SiteHeader } from '../../_components/site-header';

export default function Loading() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader query="" />
      <main className="mx-auto w-full max-w-270 px-4 pb-20 sm:px-6 lg:px-10">
        <div className="bg-muted mt-6 h-10 w-36 animate-pulse rounded-full" />
        <div className="mt-5">
          <div className="bg-muted h-8 w-96 max-w-full animate-pulse rounded-full" />
          <div className="bg-muted mt-3 h-5 w-150 max-w-full animate-pulse rounded-full" />
        </div>
        <div className="bg-muted mt-6 aspect-1000/420 w-full animate-pulse rounded-[14px]" />
        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-16">
            {Array.from({ length: 3 }, (_, index) => (
              <section key={index}>
                <div className="bg-muted h-8 w-48 animate-pulse rounded-full" />
                <div className="bg-muted mt-4 h-5 w-full animate-pulse rounded-full" />
                <div className="bg-muted mt-2 h-5 w-5/6 animate-pulse rounded-full" />
              </section>
            ))}
          </div>
          <div className="border-border hidden rounded-[14px] border p-6 lg:block">
            <div className="bg-muted h-8 w-32 animate-pulse rounded-full" />
            <div className="bg-muted mt-6 h-5 w-full animate-pulse rounded-full" />
            <div className="bg-muted mt-3 h-5 w-4/5 animate-pulse rounded-full" />
            <div className="bg-muted mt-8 h-12 w-full animate-pulse rounded-lg" />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
