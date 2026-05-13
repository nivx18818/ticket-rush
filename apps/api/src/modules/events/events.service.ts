import type { Prisma } from '@repo/db/prisma/client';

import { Injectable } from '@nestjs/common';
import { EventStatus } from '@repo/db/prisma/client';

import { EventNotDraftException, EventNotFoundException } from '@/common/exceptions/app.exceptions';
import { PrismaService } from '@/modules/prisma/prisma.service';

import type { CreateEventDto } from './dto/create-event.dto';
import type { EventDto } from './dto/event.dto';
import type { UpdateEventDto } from './dto/update-event.dto';

const EVENT_SELECT = {
  id: true,
  name: true,
  description: true,
  eventDate: true,
  venue: true,
  thumbnailUrl: true,
  status: true,
  createdAt: true,
} as const;

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  createDraft(dto: CreateEventDto): Promise<EventDto> {
    return this.prisma.event.create({
      data: {
        ...dto,
        status: EventStatus.DRAFT,
      },
      select: EVENT_SELECT,
    });
  }

  findAllForAdmin(): Promise<EventDto[]> {
    return this.prisma.event.findMany({
      orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }],
      select: EVENT_SELECT,
    });
  }

  findPublished(q?: string): Promise<EventDto[]> {
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      ...(q
        ? {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    return this.prisma.event.findMany({
      orderBy: [{ eventDate: 'asc' }, { createdAt: 'desc' }],
      select: EVENT_SELECT,
      where,
    });
  }

  async getAdminEvent(id: string): Promise<EventDto> {
    return this.getByIdOrThrow(id);
  }

  async getPublishedEvent(id: string): Promise<EventDto> {
    const event = await this.prisma.event.findFirst({
      select: EVENT_SELECT,
      where: {
        id,
        status: EventStatus.PUBLISHED,
      },
    });

    if (!event) {
      throw new EventNotFoundException(id);
    }

    return event;
  }

  async updateDraft(id: string, dto: UpdateEventDto): Promise<EventDto> {
    const event = await this.getByIdOrThrow(id);
    this.assertDraft(event);

    return this.prisma.event.update({
      data: dto,
      select: EVENT_SELECT,
      where: { id },
    });
  }

  async deleteDraft(id: string): Promise<void> {
    const event = await this.getByIdOrThrow(id);
    this.assertDraft(event);

    await this.prisma.event.delete({
      where: { id },
    });
  }

  async publish(id: string): Promise<EventDto> {
    await this.getByIdOrThrow(id);

    return this.prisma.event.update({
      data: { status: EventStatus.PUBLISHED },
      select: EVENT_SELECT,
      where: { id },
    });
  }

  async unpublish(id: string): Promise<EventDto> {
    await this.getByIdOrThrow(id);

    return this.prisma.event.update({
      data: { status: EventStatus.DRAFT },
      select: EVENT_SELECT,
      where: { id },
    });
  }

  private async getByIdOrThrow(id: string): Promise<EventDto> {
    const event = await this.prisma.event.findUnique({
      select: EVENT_SELECT,
      where: { id },
    });

    if (!event) {
      throw new EventNotFoundException(id);
    }

    return event;
  }

  private assertDraft(event: EventDto): void {
    if (event.status !== EventStatus.DRAFT) {
      throw new EventNotDraftException();
    }
  }
}
