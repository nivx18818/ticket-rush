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

export const UserRole = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
