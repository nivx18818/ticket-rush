import { PrismaClientKnownRequestError } from './prisma-namespace.mock';

export class PrismaClient {
  constructor(_options?: { adapter?: unknown }) {}

  $connect = jest.fn();
  $disconnect = jest.fn();
}

export const Prisma = {
  PrismaClientKnownRequestError,
};

export const UserGender = {
  FEMALE: 'FEMALE',
  MALE: 'MALE',
  OTHER: 'OTHER',
} as const;

export type UserGender = (typeof UserGender)[keyof typeof UserGender];

export const EventStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const ZoneName = {
  BALCONY_LEFT: 'BALCONY_LEFT',
  BALCONY_RIGHT: 'BALCONY_RIGHT',
  STANDING: 'STANDING',
  VIP: 'VIP',
  ZONE_A: 'ZONE_A',
  ZONE_B: 'ZONE_B',
  ZONE_C: 'ZONE_C',
} as const;

export type ZoneName = (typeof ZoneName)[keyof typeof ZoneName];

export const SeatStatus = {
  AVAILABLE: 'AVAILABLE',
  LOCKED: 'LOCKED',
  SOLD: 'SOLD',
} as const;

export type SeatStatus = (typeof SeatStatus)[keyof typeof SeatStatus];

export const UserRole = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
