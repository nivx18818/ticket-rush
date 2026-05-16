import { SiteFooter } from './_components/site-footer';
import { SiteHeader } from './_components/site-header';

export default function Loading() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader query="" />
      <main className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12">
        <section className="pt-10 pb-10 text-center">
          <div className="bg-muted mx-auto h-8 w-80 max-w-full animate-pulse rounded-full" />
          <div className="bg-muted mx-auto mt-3 h-5 w-96 max-w-full animate-pulse rounded-full" />
          <div className="bg-muted mx-auto mt-8 hidden h-16 max-w-215 animate-pulse rounded-full md:block" />
          <div className="bg-muted mx-auto mt-6 h-12 max-w-full animate-pulse rounded-full md:hidden" />
        </section>
        <div className="mb-6 flex scrollbar-none gap-8 overflow-x-auto border-b border-[#ebebeb] pb-3 [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="bg-muted h-5 w-16 animate-pulse rounded-full" />
          ))}
        </div>
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17.5rem),1fr))] gap-x-6 gap-y-10 pb-16">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index}>
              <div className="bg-muted aspect-square animate-pulse rounded-[14px]" />
              <div className="bg-muted mt-3 h-5 w-4/5 animate-pulse rounded-full" />
              <div className="bg-muted mt-2 h-4 w-3/5 animate-pulse rounded-full" />
              <div className="bg-muted mt-2 h-4 w-1/2 animate-pulse rounded-full" />
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
