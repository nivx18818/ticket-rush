import type { Metadata } from 'next';

import { Toaster } from '@repo/design-system/components/ui/sonner';
import { fonts } from '@repo/design-system/lib/fonts';
import '@repo/design-system/styles/globals.css';

export const metadata: Metadata = {
  title: 'Ticket Rush',
  description: 'Book your tickets online',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={fonts}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
