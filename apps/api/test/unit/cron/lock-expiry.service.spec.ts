import { SeatStatus } from '@repo/db/prisma/client';
import cron, { type ScheduledTask } from 'node-cron';

import type { PrismaService } from '@/modules/prisma/prisma.service';
import type { SeatEventsGateway } from '@/modules/realtime/seat-events.gateway';

import { LOCK_EXPIRY_CRON_EXPRESSION, LockExpiryService } from '@/modules/cron/lock-expiry.service';

jest.mock('node-cron', () => ({
  __esModule: true,
  default: {
    createTask: jest.fn(),
  },
}));

describe('LockExpiryService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  };
  const seatEventsGateway = {
    emitSeatUpdated: jest.fn(),
  };
  const task = {
    destroy: jest.fn(),
    execute: jest.fn(),
    getNextRun: jest.fn(),
    getStatus: jest.fn(),
    id: 'lock-expiry-release',
    off: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  } satisfies ScheduledTask;

  let service: LockExpiryService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(cron.createTask).mockReturnValue(task);

    service = new LockExpiryService(
      prisma as unknown as PrismaService,
      seatEventsGateway as unknown as SeatEventsGateway,
    );
  });

  it('starts a no-overlap node-cron task every 30 seconds', async () => {
    await service.onModuleInit();

    expect(cron.createTask).toHaveBeenCalledWith(
      LOCK_EXPIRY_CRON_EXPRESSION,
      expect.any(Function),
      {
        name: 'lock-expiry-release',
        noOverlap: true,
      },
    );
    expect(LOCK_EXPIRY_CRON_EXPRESSION).toBe('*/30 * * * * *');
    expect(task.start).toHaveBeenCalledTimes(1);
  });

  it('stops and destroys the scheduled task on module teardown', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(task.stop).toHaveBeenCalledTimes(1);
    expect(task.destroy).toHaveBeenCalledTimes(1);
  });

  it('bulk releases expired locks and emits one seat update per released seat', async () => {
    const eventId = 'd2a40ead-449c-4b67-bc56-149898ac1127';
    const seatId = '3b389a53-5557-4cd3-80db-f42b772a1887';

    prisma.$queryRaw.mockResolvedValue([
      {
        eventId,
        seatId,
      },
    ]);

    await expect(service.releaseExpiredLocks()).resolves.toBe(1);

    const [queryStrings] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    const query = Array.from(queryStrings).join('');

    expect(query).toContain('UPDATE seats AS s');
    expect(query).toContain("status = 'available'::seat_status");
    expect(query).toContain('locked_by = NULL');
    expect(query).toContain('locked_until = NULL');
    expect(query).toContain("s.status = 'locked'::seat_status");
    expect(query).toContain('s.locked_until <= NOW()');
    expect(query).toContain('RETURNING');

    expect(seatEventsGateway.emitSeatUpdated).toHaveBeenCalledWith({
      eventId,
      seatId,
      status: SeatStatus.AVAILABLE,
    });
  });

  it('returns zero and emits nothing when no locks are expired', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(service.releaseExpiredLocks()).resolves.toBe(0);

    expect(seatEventsGateway.emitSeatUpdated).not.toHaveBeenCalled();
  });
});
