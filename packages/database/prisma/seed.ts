import * as bcrypt from 'bcrypt';

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { PrismaClient } from '../generated/prisma/client';
import type { EventStatus, SeatStatus, ZoneName } from '../generated/prisma/enums';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_ADMIN_EMAIL = 'admin@ticketrush.local';
const DEFAULT_ADMIN_NAME = 'TicketRush Admin';
const DEFAULT_ADMIN_PASSWORD = 'admin@ticketrush';
const DEFAULT_ADMIN_DOB = new Date('2000-01-01');

type SampleZone = {
  name: ZoneName;
  rows: number;
  seatsPerRow: number;
  price: number;
};

type SampleEvent = {
  name: string;
  description: string;
  eventDate: Date;
  venue: string;
  thumbnailUrl: string;
  status: EventStatus;
  zones: SampleZone[];
};

const SAMPLE_EVENTS: SampleEvent[] = [
  {
    name: 'Aurora Nights - World Tour 2026',
    description:
      'An immersive synth-pop experience with state-of-the-art lighting and a 32-piece live band. Doors open at 7:00 PM.',
    eventDate: new Date('2026-06-14T13:00:00Z'),
    venue: 'Skyline Arena, Hanoi, Vietnam',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80',
    status: 'PUBLISHED' as const,
    zones: [
      { name: 'VIP', rows: 3, seatsPerRow: 12, price: 220 },
      { name: 'ZONE_A', rows: 6, seatsPerRow: 14, price: 120 },
      { name: 'ZONE_B', rows: 8, seatsPerRow: 16, price: 60 },
      { name: 'ZONE_C', rows: 6, seatsPerRow: 12, price: 60 },
      { name: 'BALCONY_LEFT', rows: 4, seatsPerRow: 8, price: 80 },
      { name: 'BALCONY_RIGHT', rows: 4, seatsPerRow: 8, price: 80 },
    ],
  },
  {
    name: 'Pulse City Live',
    description: 'A one-night electronic showcase with immersive visuals.',
    eventDate: new Date('2026-09-05T18:00:00Z'),
    venue: 'Pulse City Hall, Ho Chi Minh City',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=80',
    status: 'PUBLISHED' as const,
    zones: [
      { name: 'STANDING', rows: 14, seatsPerRow: 20, price: 70 },
      { name: 'BALCONY_LEFT', rows: 5, seatsPerRow: 16, price: 50 },
      { name: 'BALCONY_RIGHT', rows: 5, seatsPerRow: 16, price: 50 },
    ],
  },
  {
    name: 'Harbor Lights Festival',
    description: 'A waterfront festival with live bands, food stalls, and late-night DJ sets.',
    eventDate: new Date('2026-10-02T17:30:00Z'),
    venue: 'Han River Park, Da Nang',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=1200&q=80',
    status: 'PUBLISHED' as const,
    zones: [
      { name: 'VIP', rows: 3, seatsPerRow: 10, price: 150 },
      { name: 'STANDING', rows: 12, seatsPerRow: 18, price: 65 },
      { name: 'ZONE_A', rows: 6, seatsPerRow: 12, price: 80 },
    ],
  },
  {
    name: 'Midnight Comedy Room',
    description: 'A curated stand-up night featuring touring comics and local favorites.',
    eventDate: new Date('2026-10-18T20:00:00Z'),
    venue: 'Old Quarter Playhouse, Hanoi',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1200&q=80',
    status: 'PUBLISHED' as const,
    zones: [
      { name: 'ZONE_A', rows: 7, seatsPerRow: 10, price: 55 },
      { name: 'ZONE_B', rows: 6, seatsPerRow: 10, price: 40 },
      { name: 'BALCONY_LEFT', rows: 3, seatsPerRow: 8, price: 35 },
      { name: 'BALCONY_RIGHT', rows: 3, seatsPerRow: 8, price: 35 },
    ],
  },
  {
    name: 'Classic Theater Weekend',
    description: 'A two-act stage production with live orchestra accompaniment.',
    eventDate: new Date('2026-11-07T19:00:00Z'),
    venue: 'Imperial Theater, Hue',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80',
    status: 'PUBLISHED' as const,
    zones: [
      { name: 'VIP', rows: 2, seatsPerRow: 12, price: 120 },
      { name: 'ZONE_A', rows: 8, seatsPerRow: 14, price: 85 },
      { name: 'ZONE_B', rows: 8, seatsPerRow: 14, price: 65 },
    ],
  },
  {
    name: 'Arena Sports Night',
    description: 'A fast-paced indoor sports event with reserved seating across every zone.',
    eventDate: new Date('2026-11-21T18:30:00Z'),
    venue: 'Coastal Arena, Nha Trang',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1200&q=80',
    status: 'PUBLISHED' as const,
    zones: [
      { name: 'VIP', rows: 4, seatsPerRow: 10, price: 130 },
      { name: 'ZONE_A', rows: 10, seatsPerRow: 16, price: 75 },
      { name: 'ZONE_B', rows: 10, seatsPerRow: 16, price: 55 },
      { name: 'ZONE_C', rows: 8, seatsPerRow: 14, price: 40 },
    ],
  },
];

const ROW_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const toRowLabel = (index: number): string => {
  let value = index;
  let label = '';

  do {
    label = ROW_LABELS[value % 26] + label;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return label;
};

const buildSeats = (zoneId: string, rows: number, seatsPerRow: number, sampleSeed: number) => {
  const seats = [] as {
    lockedUntil: Date | null;
    rowLabel: string;
    seatNumber: number;
    status: SeatStatus;
    zoneId: string;
  }[];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowLabel = toRowLabel(rowIndex);

    for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber += 1) {
      const status = resolveSampleSeatStatus(sampleSeed, rowIndex, seatNumber);

      seats.push({
        lockedUntil: status === 'LOCKED' ? new Date(Date.now() + 20 * 60 * 1000) : null,
        rowLabel,
        seatNumber,
        status,
        zoneId,
      });
    }
  }

  return seats;
};

const resolveSampleSeatStatus = (
  sampleSeed: number,
  rowIndex: number,
  seatNumber: number,
): SeatStatus => {
  const statusSeed = (sampleSeed + rowIndex * 7 + seatNumber * 3) % 23;

  if (statusSeed === 0) {
    return 'SOLD';
  }

  if (statusSeed === 1 || statusSeed === 2) {
    return 'LOCKED';
  }

  return 'AVAILABLE';
};

const ensureAdminUser = async () => {
  const email = process.env.SEED_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME ?? DEFAULT_ADMIN_NAME;
  const password = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      email,
      name,
      passwordHash,
      role: 'ADMIN',
      gender: 'OTHER',
      dateOfBirth: DEFAULT_ADMIN_DOB,
    },
  });
};

const resetCatalogData = async () => {
  await prisma.ticket.deleteMany();
  await prisma.orderSeat.deleteMany();
  await prisma.order.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.event.deleteMany();
};

const ensureSampleEvents = async () => {
  for (const [eventIndex, event] of SAMPLE_EVENTS.entries()) {
    const eventRecord = await prisma.event.create({
      data: {
        description: event.description,
        eventDate: event.eventDate,
        name: event.name,
        status: event.status,
        thumbnailUrl: event.thumbnailUrl,
        venue: event.venue,
      },
    });

    for (const [zoneIndex, zone] of event.zones.entries()) {
      const zoneRecord = await prisma.zone.create({
        data: {
          eventId: eventRecord.id,
          name: zone.name,
          price: zone.price,
          rows: zone.rows,
          seatsPerRow: zone.seatsPerRow,
        },
      });

      const seatData = buildSeats(
        zoneRecord.id,
        zone.rows,
        zone.seatsPerRow,
        eventIndex * 31 + zoneIndex * 11,
      );

      await prisma.seat.createMany({
        data: seatData,
      });
    }
  }
};

const main = async () => {
  await ensureAdminUser();
  await resetCatalogData();
  await ensureSampleEvents();
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Database seed failed.');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
