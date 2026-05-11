import { PrismaClientKnownRequestError } from './prisma-namespace.mock';

export class PrismaClient {
  constructor(_options?: { adapter?: unknown }) {}

  $connect = jest.fn();
  $disconnect = jest.fn();
}

export const Prisma = {
  PrismaClientKnownRequestError,
};
