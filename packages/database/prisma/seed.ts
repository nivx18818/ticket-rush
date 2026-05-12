import * as bcrypt from 'bcrypt';

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { PrismaClient } from '../generated/prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_ADMIN_EMAIL = 'admin@ticketrush.local';
const DEFAULT_ADMIN_NAME = 'TicketRush Admin';
const DEFAULT_ADMIN_PASSWORD = 'admin@ticketrush';
const DEFAULT_ADMIN_DOB = new Date('2000-01-01');

const SAMPLE_EVENTS = [
  {
    name: 'Neon Skyline Fest',
    description: 'An open-air lineup of synthwave and indie-pop artists.',
    eventDate: new Date('2026-08-12T19:30:00Z'),
    venue: 'Skyline Arena',
    thumbnailUrl: 'https://images.example.com/events/neon-skyline.jpg',
    status: 'PUBLISHED' as const,
    zones: [
      { name: 'VIP', rows: 4, seatsPerRow: 8, price: 180 },
      { name: 'ZONE_A', rows: 8, seatsPerRow: 14, price: 95 },
      { name: 'ZONE_B', rows: 8, seatsPerRow: 14, price: 75 },
      { name: 'ZONE_C', rows: 6, seatsPerRow: 12, price: 60 },
    ],
  },
  {
    name: 'Pulse City Live',
    description: 'A one-night electronic showcase with immersive visuals.',
    eventDate: new Date('2026-09-05T18:00:00Z'),
    venue: 'Pulse City Hall',
    thumbnailUrl: 'https://images.example.com/events/pulse-city.jpg',
    status: 'PUBLISHED' as const,
    zones: [
      { name: 'STANDING', rows: 14, seatsPerRow: 20, price: 70 },
      { name: 'BALCONY_LEFT', rows: 5, seatsPerRow: 16, price: 50 },
      { name: 'BALCONY_RIGHT', rows: 5, seatsPerRow: 16, price: 50 },
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

const buildSeats = (zoneId: string, rows: number, seatsPerRow: number) => {
  const seats = [] as {
    zoneId: string;
    rowLabel: string;
    seatNumber: number;
  }[];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const rowLabel = toRowLabel(rowIndex);

    for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber += 1) {
      seats.push({
        zoneId,
        rowLabel,
        seatNumber,
      });
    }
  }

  return seats;
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

const ensureSampleEvents = async () => {
  for (const event of SAMPLE_EVENTS) {
    const existingEvent = await prisma.event.findFirst({
      where: { name: event.name },
    });

    const eventRecord =
      existingEvent ??
      (await prisma.event.create({
        data: {
          name: event.name,
          description: event.description,
          eventDate: event.eventDate,
          venue: event.venue,
          thumbnailUrl: event.thumbnailUrl,
          status: event.status,
        },
      }));

    for (const zone of event.zones) {
      const zoneRecord = await prisma.zone.upsert({
        where: {
          eventId_name: {
            eventId: eventRecord.id,
            name: zone.name,
          },
        },
        update: {
          rows: zone.rows,
          seatsPerRow: zone.seatsPerRow,
          price: zone.price,
        },
        create: {
          eventId: eventRecord.id,
          name: zone.name,
          rows: zone.rows,
          seatsPerRow: zone.seatsPerRow,
          price: zone.price,
        },
      });

      const expectedSeatCount = zone.rows * zone.seatsPerRow;
      const existingSeatCount = await prisma.seat.count({
        where: { zoneId: zoneRecord.id },
      });

      if (existingSeatCount >= expectedSeatCount) {
        continue;
      }

      const seatData = buildSeats(zoneRecord.id, zone.rows, zone.seatsPerRow);

      await prisma.seat.createMany({
        data: seatData,
        skipDuplicates: true,
      });
    }
  }
};

const main = async () => {
  await ensureAdminUser();
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
