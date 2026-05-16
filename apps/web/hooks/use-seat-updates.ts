'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { getRealtimeBaseUrl, seatUpdatedEventSchema, type SeatUpdatedEvent } from '@/lib/api';

type SeatSocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'idle';

type UseSeatUpdatesOptions = {
  enabled?: boolean;
  eventId: string | null | undefined;
  onSeatUpdatedAction?: (payload: SeatUpdatedEvent) => void;
};

type UseSeatUpdatesResult = {
  isConnected: boolean;
  status: SeatSocketStatus;
};

export function useSeatUpdates({
  enabled = true,
  eventId,
  onSeatUpdatedAction,
}: UseSeatUpdatesOptions): UseSeatUpdatesResult {
  const [status, setStatus] = useState<SeatSocketStatus>('idle');
  const onSeatUpdatedRef = useRef(onSeatUpdatedAction);

  useEffect(() => {
    onSeatUpdatedRef.current = onSeatUpdatedAction;
  }, [onSeatUpdatedAction]);

  useEffect(() => {
    if (!enabled || !eventId) {
      setStatus('idle');
      return;
    }

    const socket: Socket = io(getRealtimeBaseUrl(), {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    const handleConnect = () => setStatus('connected');
    const handleConnectError = () => setStatus('error');
    const handleDisconnect = () => setStatus('disconnected');
    const handleSeatUpdated = (payload: unknown) => {
      const parsedPayload = seatUpdatedEventSchema.safeParse(payload);

      if (!parsedPayload.success || parsedPayload.data.eventId !== eventId) {
        return;
      }

      onSeatUpdatedRef.current?.(parsedPayload.data);
    };

    setStatus('connecting');
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    socket.on('seat:updated', handleSeatUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      socket.off('seat:updated', handleSeatUpdated);
      socket.disconnect();
    };
  }, [enabled, eventId]);

  return {
    isConnected: status === 'connected',
    status,
  };
}

export type { SeatSocketStatus, UseSeatUpdatesOptions, UseSeatUpdatesResult };
