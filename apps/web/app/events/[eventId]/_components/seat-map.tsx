'use client';

import { cn } from '@repo/design-system/lib/utils';

import type { Seat, SeatStatus, ZoneName } from '@/lib/api';

import { ZONE_LAYOUT, ZONE_ORDER } from '@/config/zone-layout';

type GroupedZoneSeats = {
  price: number;
  rows: GroupedSeatRow[];
  seats: Seat[];
  zoneName: ZoneName;
};

type GroupedSeatRow = {
  label: string;
  seats: Seat[];
};

type SeatMapProps = {
  maxSelection: number;
  onSeatToggleAction: (seatId: string) => void;
  seats: Seat[];
  selectedSeatIds: string[];
};

const STATUS_LABELS: Record<SeatStatus, string> = {
  AVAILABLE: 'Available',
  LOCKED: 'Locked',
  SOLD: 'Sold',
};

const STATUS_LEGEND = [
  { className: 'bg-seat-available', label: 'Available' },
  { className: 'bg-seat-selected', label: 'Selected' },
  { className: 'bg-seat-locked', label: 'Locked' },
  { className: 'bg-seat-sold', label: 'Sold' },
];

export function SeatMap({
  maxSelection,
  onSeatToggleAction,
  seats,
  selectedSeatIds,
}: SeatMapProps) {
  const selectedSeatSet = new Set(selectedSeatIds);
  const groupedZones = groupSeatsByZone(seats);
  const isAtCapacity = selectedSeatIds.length >= maxSelection;

  if (groupedZones.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-[14px] border py-12 text-center text-sm">
        No seats have been configured for this event yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="bg-muted text-muted-foreground mx-auto flex h-9 max-w-150 items-center justify-center rounded-full text-[13px] leading-5 font-semibold uppercase">
          Stage
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(7rem,0.85fr)_repeat(3,minmax(8rem,1fr))_minmax(7rem,0.85fr)] lg:grid-rows-[auto_auto_auto] lg:items-start">
        {groupedZones.map((zone) => {
          const zoneConfig = ZONE_LAYOUT[zone.zoneName];

          return (
            <section
              key={zone.zoneName}
              className={cn(
                'border-border bg-background min-w-0 rounded-[14px] border p-4',
                zoneConfig.positionClassName,
              )}
              aria-label={`${zoneConfig.label} seats`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn('size-2.5 shrink-0 rounded-full', zoneConfig.accentClassName)}
                    aria-hidden="true"
                  />
                  <h3 className="text-foreground truncate text-base leading-5 font-semibold">
                    {zoneConfig.label}
                  </h3>
                </div>
                <p className="text-muted-foreground shrink-0 text-sm leading-5">
                  {formatPrice(zone.price)}
                </p>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="w-max min-w-full space-y-1.5">
                  {zone.rows.map((row) => (
                    <div key={row.label} className="flex items-center gap-1.5">
                      <span className="text-muted-foreground flex w-5 shrink-0 justify-end pr-1 text-xs leading-4">
                        {row.label}
                      </span>
                      <div className="flex gap-1.5">
                        {row.seats.map((seat) => {
                          const isSelected = selectedSeatSet.has(seat.id);
                          const isUnavailable = seat.status !== 'AVAILABLE' && !isSelected;
                          const isCapacityDisabled = !isSelected && isAtCapacity;
                          const isDisabled = isUnavailable || isCapacityDisabled;

                          return (
                            <button
                              key={seat.id}
                              className={cn(
                                'text-primary-foreground focus-visible:ring-ring/40 flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] leading-none font-semibold transition-transform focus-visible:ring-2 focus-visible:outline-none',
                                getSeatStatusClassName(seat.status, isSelected),
                                isSelected && 'scale-105',
                                isDisabled && 'cursor-not-allowed opacity-60',
                                !isDisabled && 'hover:brightness-95 active:scale-95',
                              )}
                              type="button"
                              disabled={isDisabled}
                              aria-label={buildSeatLabel(zone.zoneName, seat)}
                              aria-pressed={isSelected}
                              title={buildSeatTitle(zone.zoneName, seat, isSelected)}
                              onClick={() => onSeatToggleAction(seat.id)}
                            >
                              {seat.seatNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="border-border flex flex-wrap gap-x-5 gap-y-3 border-t pt-4">
        {STATUS_LEGEND.map((item) => (
          <div
            key={item.label}
            className="text-muted-foreground flex items-center gap-2 text-[13px] leading-5"
          >
            <span className={cn('size-3.5 rounded', item.className)} aria-hidden="true" />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupSeatsByZone(seats: Seat[]): GroupedZoneSeats[] {
  const zonesByName = new Map<ZoneName, Seat[]>();

  for (const seat of seats) {
    const zoneSeats = zonesByName.get(seat.zoneName) ?? [];

    zoneSeats.push(seat);
    zonesByName.set(seat.zoneName, zoneSeats);
  }

  return ZONE_ORDER.flatMap((zoneName) => {
    const zoneSeats = zonesByName.get(zoneName);

    if (!zoneSeats?.length) {
      return [];
    }

    return [
      {
        price: zoneSeats[0]?.price ?? 0,
        rows: groupSeatsByRow(zoneSeats),
        seats: zoneSeats,
        zoneName,
      },
    ];
  });
}

function groupSeatsByRow(seats: Seat[]): GroupedSeatRow[] {
  const rowsByLabel = new Map<string, Seat[]>();

  for (const seat of seats) {
    const rowSeats = rowsByLabel.get(seat.rowLabel) ?? [];

    rowSeats.push(seat);
    rowsByLabel.set(seat.rowLabel, rowSeats);
  }

  return Array.from(rowsByLabel.entries())
    .sort(([rowA], [rowB]) => compareRowLabels(rowA, rowB))
    .map(([label, rowSeats]) => ({
      label,
      seats: rowSeats.toSorted((seatA, seatB) => seatA.seatNumber - seatB.seatNumber),
    }));
}

function compareRowLabels(rowA: string, rowB: string): number {
  return rowLabelToNumber(rowA) - rowLabelToNumber(rowB);
}

function rowLabelToNumber(rowLabel: string): number {
  return rowLabel
    .toUpperCase()
    .split('')
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

function getSeatStatusClassName(status: SeatStatus, isSelected: boolean): string {
  if (isSelected) {
    return 'bg-seat-selected';
  }

  if (status === 'LOCKED') {
    return 'bg-seat-locked';
  }

  if (status === 'SOLD') {
    return 'bg-seat-sold';
  }

  return 'bg-seat-available';
}

function buildSeatLabel(zoneName: ZoneName, seat: Seat): string {
  const zoneLabel = ZONE_LAYOUT[zoneName].label;

  return `${zoneLabel}, row ${seat.rowLabel}, seat ${seat.seatNumber}`;
}

function buildSeatTitle(zoneName: ZoneName, seat: Seat, isSelected: boolean): string {
  const status = isSelected ? 'Selected' : STATUS_LABELS[seat.status];

  return `${buildSeatLabel(zoneName, seat)} - ${status}`;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export type { GroupedSeatRow, GroupedZoneSeats };
