import type { ZoneName } from '@/lib/api';

import { ZONE_LAYOUT } from '@/config/zone-layout';

type SeatLabelInput = {
  rowLabel: string;
  seatNumber: number;
  zoneName: ZoneName;
};

export function formatEventDate(value: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    weekday: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export function formatSeatLabel(seat: SeatLabelInput): string {
  return `${ZONE_LAYOUT[seat.zoneName].label} - Row ${seat.rowLabel}, Seat ${seat.seatNumber}`;
}

export function formatShortId(value: string): string {
  return value.slice(0, 13);
}
