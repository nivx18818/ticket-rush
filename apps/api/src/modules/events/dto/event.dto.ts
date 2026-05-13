import type { EventStatus } from '@repo/db/prisma/client';

export class EventDto {
  id!: string;
  name!: string;
  description!: string;
  eventDate!: Date;
  venue!: string;
  thumbnailUrl!: string;
  status!: EventStatus;
  createdAt!: Date;
}
