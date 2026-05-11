import { Figtree, Inter } from 'next/font/google';

import { cn } from './utils';

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const fonts = cn(
  figtree.variable,
  inter.variable,
  'touch-manipulation font-sans antialiased',
);
