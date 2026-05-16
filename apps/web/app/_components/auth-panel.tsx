import type { ReactNode } from 'react';

type AuthPanelProps = {
  children: ReactNode;
  title: string;
};

export function AuthPanel({ children, title }: AuthPanelProps) {
  return (
    <main className="flex min-h-[calc(100vh-5rem)] justify-center px-4 py-12 sm:px-6">
      <section className="border-border bg-background h-fit w-full max-w-108 rounded-[14px] border">
        <div className="border-border border-b px-6 py-5 text-center">
          <h1 className="text-foreground text-base leading-6 font-semibold">{title}</h1>
        </div>
        <div className="px-6 py-6">{children}</div>
      </section>
    </main>
  );
}
