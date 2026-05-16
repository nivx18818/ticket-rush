import { SeatStatus } from '@repo/db/prisma/client';
import cron, { type ScheduledTask } from 'node-cron';

import type { PrismaService } from '@/modules/prisma/prisma.service';
import type { RealtimeUpdatesService } from '@/modules/realtime/realtime-updates.service';

import {
  ORDER_EXPIRY_CRON_EXPRESSION,
  ORDER_EXPIRY_TTL_MINUTES,
  OrderExpiryService,
} from '@/modules/cron/order-expiry.service';

jest.mock('node-cron', () => ({
  __esModule: true,
  default: {
    createTask: jest.fn(),
  },
}));

describe('OrderExpiryService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const realtimeUpdatesService = {
    emitSeatLifecycleChanges: jest.fn(),
  };
  const task = {
    destroy: jest.fn(),
    execute: jest.fn(),
    getNextRun: jest.fn(),
    getStatus: jest.fn(),
    id: 'order-expiry-release',
    off: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  } satisfies ScheduledTask;

  let service: OrderExpiryService;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(cron.createTask).mockReturnValue(task);
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    );

    service = new OrderExpiryService(
      prisma as unknown as PrismaService,
      realtimeUpdatesService as unknown as RealtimeUpdatesService,
    );
  });

  it('starts a no-overlap node-cron task every minute', async () => {
    await service.onModuleInit();

    expect(cron.createTask).toHaveBeenCalledWith(
      ORDER_EXPIRY_CRON_EXPRESSION,
      expect.any(Function),
      {
        name: 'order-expiry-release',
        noOverlap: true,
      },
    );
    expect(ORDER_EXPIRY_CRON_EXPRESSION).toBe('0 * * * * *');
    expect(ORDER_EXPIRY_TTL_MINUTES).toBe(10);
    expect(task.start).toHaveBeenCalledTimes(1);
  });

  it('stops and destroys the scheduled task on module teardown', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(task.stop).toHaveBeenCalledTimes(1);
    expect(task.destroy).toHaveBeenCalledTimes(1);
  });

  it('expires stale orders and releases seats with realtime emissions', async () => {
    const eventId = 'd2a40ead-449c-4b67-bc56-149898ac1127';
    const orderId = '9d3ec931-a0e7-47c7-a8f7-eefec44ed577';
    const seatId = '3b389a53-5557-4cd3-80db-f42b772a1887';

    prisma.$queryRaw.mockResolvedValueOnce([{ eventId, orderId }]).mockResolvedValueOnce([
      {
        eventId,
        seatId,
      },
    ]);

    await expect(service.expireStaleOrders()).resolves.toBe(1);

    const [orderQueryStrings] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    const orderQuery = Array.from(orderQueryStrings).join('');

    expect(orderQuery).toContain('UPDATE orders');
    expect(orderQuery).toContain("status = 'expired'::order_status");
    expect(orderQuery).toContain("status = 'pending'::order_status");
    expect(orderQuery).toContain('RETURNING');

    const [seatQueryStrings] = prisma.$queryRaw.mock.calls[1] as [TemplateStringsArray];
    const seatQuery = Array.from(seatQueryStrings).join('');

    expect(seatQuery).toContain('UPDATE seats s');
    expect(seatQuery).toContain("status = 'available'::seat_status");
    expect(seatQuery).toContain('order_seats');
    expect(seatQuery).toContain('locked_by = o.user_id');
    expect(seatQuery).toContain('RETURNING');

    expect(realtimeUpdatesService.emitSeatLifecycleChanges).toHaveBeenCalledWith(
      eventId,
      [{ eventId, seatId }],
      SeatStatus.AVAILABLE,
    );
  });

  it('returns zero and emits nothing when no stale orders exist', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await expect(service.expireStaleOrders()).resolves.toBe(0);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(realtimeUpdatesService.emitSeatLifecycleChanges).not.toHaveBeenCalled();
  });
});
