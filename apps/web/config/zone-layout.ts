import type { ZoneName } from '@/lib/api';

type ZoneDisplayConfig = {
  accentClassName: string;
  area: string;
  label: string;
  positionClassName: string;
};

export const ZONE_ORDER = [
  'VIP',
  'BALCONY_LEFT',
  'ZONE_A',
  'ZONE_B',
  'ZONE_C',
  'BALCONY_RIGHT',
  'STANDING',
] as const satisfies ZoneName[];

export const ZONE_LAYOUT: Record<ZoneName, ZoneDisplayConfig> = {
  BALCONY_LEFT: {
    accentClassName: 'bg-zone-balcony',
    area: 'bal-l',
    label: 'Balcony L',
    positionClassName: 'lg:col-start-1 lg:row-start-2 lg:row-span-2',
  },
  BALCONY_RIGHT: {
    accentClassName: 'bg-zone-balcony',
    area: 'bal-r',
    label: 'Balcony R',
    positionClassName: 'lg:col-start-5 lg:row-start-2 lg:row-span-2',
  },
  STANDING: {
    accentClassName: 'bg-zone-standing',
    area: 'floor',
    label: 'Standing',
    positionClassName: 'lg:col-start-2 lg:col-span-3 lg:row-start-3',
  },
  VIP: {
    accentClassName: 'bg-zone-vip',
    area: 'vip',
    label: 'VIP',
    positionClassName: 'lg:col-start-2 lg:col-span-3 lg:row-start-1',
  },
  ZONE_A: {
    accentClassName: 'bg-zone-a',
    area: 'a',
    label: 'Zone A',
    positionClassName: 'lg:col-start-2 lg:row-start-2',
  },
  ZONE_B: {
    accentClassName: 'bg-zone-b',
    area: 'b',
    label: 'Zone B',
    positionClassName: 'lg:col-start-3 lg:row-start-2',
  },
  ZONE_C: {
    accentClassName: 'bg-zone-c',
    area: 'c',
    label: 'Zone C',
    positionClassName: 'lg:col-start-4 lg:row-start-2',
  },
};

export type { ZoneDisplayConfig };
