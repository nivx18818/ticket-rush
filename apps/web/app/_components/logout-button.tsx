'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { clientApi } from '@/lib/api/client';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);

    try {
      await clientApi.logout();
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <button
      className="text-muted-foreground hover:bg-muted hidden h-9 items-center rounded-full px-4 text-sm font-medium sm:inline-flex"
      type="button"
      disabled={isPending}
      onClick={handleLogout}
    >
      {isPending ? 'Logging out' : 'Log out'}
    </button>
  );
}
