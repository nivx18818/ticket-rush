'use client';

import { useEffect, useState } from 'react';

function calculateRemainingSeconds(lockedUntilIso: string | null): number | null {
  if (!lockedUntilIso) {
    return null;
  }

  return Math.max(0, Math.ceil((new Date(lockedUntilIso).getTime() - Date.now()) / 1000));
}

export function useRemainingSeconds(lockedUntilIso: string | null): number | null {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() =>
    calculateRemainingSeconds(lockedUntilIso),
  );

  useEffect(() => {
    setRemainingSeconds(calculateRemainingSeconds(lockedUntilIso));

    if (!lockedUntilIso) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds(calculateRemainingSeconds(lockedUntilIso));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [lockedUntilIso]);

  return remainingSeconds;
}
