import { Test } from '@nestjs/testing';
import { EventStatus } from '@repo/db/prisma/client';

import { AppConflictException, AppNotFoundException } from '@/common/exceptions/app.exceptions';
import { EventsService } from '@/modules/events/events.service';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('EventsService', () => {
  const prisma = {
    event: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const draftEvent = {
    id: 'd2a40ead-449c-4b67-bc56-149898ac1127',
    name: 'Summer Fest',
    description: 'Outdoor music night',
    eventDate: new Date('2026-06-01T12:00:00Z'),
    venue: 'Main Hall',
    thumbnailUrl: 'https://example.com/summer-fest.jpg',
    status: EventStatus.DRAFT,
    createdAt: new Date('2026-05-12T00:00:00Z'),
  };

  const publishedEvent = {
    ...draftEvent,
    status: EventStatus.PUBLISHED,
  };

  let service: EventsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = moduleRef.get(EventsService);
  });

  it('creates events as drafts', async () => {
    prisma.event.create.mockResolvedValue(draftEvent);

    await expect(
      service.createDraft({
        name: draftEvent.name,
        description: draftEvent.description,
        eventDate: draftEvent.eventDate,
        venue: draftEvent.venue,
        thumbnailUrl: draftEvent.thumbnailUrl,
      }),
    ).resolves.toEqual(draftEvent);

    const [createArgs] = prisma.event.create.mock.calls[0] as [{ data: { status: EventStatus } }];

    expect(createArgs.data.status).toBe(EventStatus.DRAFT);
  });

  it('lists published events only and applies keyword search', async () => {
    prisma.event.findMany.mockResolvedValue([publishedEvent]);

    await expect(service.findPublished('summer')).resolves.toEqual([publishedEvent]);

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          name: {
            contains: 'summer',
            mode: 'insensitive',
          },
          status: EventStatus.PUBLISHED,
        },
      }),
    );
  });

  it('does not return draft events from public detail lookup', async () => {
    prisma.event.findFirst.mockResolvedValue(null);

    await expect(service.getPublishedEvent(draftEvent.id)).rejects.toBeInstanceOf(
      AppNotFoundException,
    );

    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: draftEvent.id,
          status: EventStatus.PUBLISHED,
        },
      }),
    );
  });

  it('updates draft events', async () => {
    const renamedEvent = {
      ...draftEvent,
      name: 'Renamed Summer Fest',
    };

    prisma.event.findUnique.mockResolvedValue(draftEvent);
    prisma.event.update.mockResolvedValue(renamedEvent);

    await expect(service.updateDraft(draftEvent.id, { name: renamedEvent.name })).resolves.toEqual(
      renamedEvent,
    );

    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: renamedEvent.name },
        where: { id: draftEvent.id },
      }),
    );
  });

  it('rejects updates and deletes for published events', async () => {
    prisma.event.findUnique.mockResolvedValue(publishedEvent);

    await expect(
      service.updateDraft(publishedEvent.id, { venue: 'New Venue' }),
    ).rejects.toBeInstanceOf(AppConflictException);
    await expect(service.deleteDraft(publishedEvent.id)).rejects.toBeInstanceOf(
      AppConflictException,
    );
    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  it('publishes and unpublishes events', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(draftEvent).mockResolvedValueOnce(publishedEvent);
    prisma.event.update.mockResolvedValueOnce(publishedEvent).mockResolvedValueOnce(draftEvent);

    await expect(service.publish(draftEvent.id)).resolves.toEqual(publishedEvent);
    await expect(service.unpublish(publishedEvent.id)).resolves.toEqual(draftEvent);

    expect(prisma.event.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: { status: EventStatus.PUBLISHED },
        where: { id: draftEvent.id },
      }),
    );
    expect(prisma.event.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: { status: EventStatus.DRAFT },
        where: { id: publishedEvent.id },
      }),
    );
  });

  it('throws when an event is missing', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(service.getAdminEvent(draftEvent.id)).rejects.toBeInstanceOf(AppNotFoundException);
  });
});
