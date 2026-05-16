import Link from 'next/link';

const FOOTER_SECTIONS = [
  {
    links: [
      { href: '/', label: 'Help center' },
      { href: '/', label: 'Seat map guide' },
      { href: '/account/tickets', label: 'Ticket delivery' },
      { href: '/', label: 'Accessibility' },
    ],
    title: 'Support',
  },
  {
    links: [
      { href: '/', label: 'List your event' },
      { href: '/', label: 'Organizer resources' },
      { href: '/', label: 'Venue partners' },
      { href: '/', label: 'Responsible ticketing' },
    ],
    title: 'Hosting',
  },
  {
    links: [
      { href: '/', label: 'TicketRush' },
      { href: '/', label: 'Newsroom' },
      { href: '/', label: 'Careers' },
      { href: '/login', label: 'Account' },
    ],
    title: 'TicketRush',
  },
] as const;

const LEGAL_LINKS = ['Privacy', 'Terms', 'Sitemap'] as const;

export function SiteFooter() {
  return (
    <footer className="border-border bg-background border-t">
      <div className="mx-auto w-full max-w-360 px-4 py-10 sm:px-6 lg:px-8 2xl:px-12">
        <div className="grid gap-8 border-b pb-10 sm:grid-cols-3">
          {FOOTER_SECTIONS.map((section) => (
            <section key={section.title} aria-labelledby={`${section.title}-footer-heading`}>
              <h2
                id={`${section.title}-footer-heading`}
                className="text-foreground text-base leading-6 font-medium"
              >
                {section.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.label}`}>
                    <Link
                      className="text-foreground text-sm leading-5 underline-offset-4 hover:underline"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="text-muted-foreground flex flex-col gap-4 pt-6 text-[13px] leading-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>(c) 2026 TicketRush, Inc.</span>
            {LEGAL_LINKS.map((label) => (
              <Link key={label} className="underline-offset-4 hover:underline" href="/">
                {label}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>English (US)</span>
            <span>USD</span>
            <span>Facebook</span>
            <span>X</span>
            <span>Instagram</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
