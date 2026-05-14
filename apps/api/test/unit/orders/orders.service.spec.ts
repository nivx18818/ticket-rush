import { Test } from '@nestjs/testing';
import { OrderStatus, SeatStatus, ZoneName } from '@repo/db/prisma/client';

import {
  OrderExpiredException,
  OrderNotFoundException,
  OrderNotPendingException,
  OrderSeatsInvalidException,
} from '@/common/exceptions/app.exceptions';
import { OrdersService } from '@/modules/orders/orders.service';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { RealtimeUpdatesService } from '@/modules/realtime/realtime-updates.service';

describe('OrdersService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    orderSeat: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    seat: {
      updateMany: jest.fn(),
    },
    ticket: {
      createMany: jest.fn(),
    },
  };
  const realtimeUpdatesService = {
    emitSeatLifecycleChanges: jest.fn(),
  };

  const userId = '9ae59e53-11d2-45c1-a42f-e1eb0f88c22b';
  const eventId = 'd2a40ead-449c-4b67-bc56-149898ac1127';
  const orderId = '9d3ec931-a0e7-47c7-a8f7-eefec44ed577';
  const seatId = '3b389a53-5557-4cd3-80db-f42b772a1887';
  const zoneId = '4dd05fbf-fb23-4fb0-9828-15fe05f3ac14';

  let service: OrdersService;

  const lockedSeat = {
    eventId,
    id: seatId,
    lockedById: userId,
    lockedUntil: new Date(Date.now() + 60_000),
    price: { toString: () => '180.5' },
    rowLabel: 'A',
    seatNumber: 1,
    status: 'locked',
    zoneId,
    zoneName: ZoneName.VIP,
  };

  const orderRecord = {
    createdAt: new Date('2026-05-13T00:00:00Z'),
    eventId,
    id: orderId,
    seats: [
      {
        priceSnapshot: { toString: () => '180.5' },
        seat: {
          id: seatId,
          rowLabel: 'A',
          seatNumber: 1,
          status: SeatStatus.LOCKED,
          zone: {
            id: zoneId,
            name: ZoneName.VIP,
          },
        },
      },
    ],
    status: OrderStatus.PENDING,
    tickets: [],
    totalPrice: { toString: () => '180.5' },
    userId,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback(prisma),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: RealtimeUpdatesService,
          useValue: realtimeUpdatesService,
        },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('creates a pending order from current-user locked seats', async () => {
    prisma.$queryRaw.mockResolvedValue([lockedSeat]);
    prisma.orderSeat.findFirst.mockResolvedValue(null);
    prisma.order.create.mockResolvedValue({ id: orderId });
    prisma.orderSeat.createMany.mockResolvedValue({ count: 1 });
    prisma.order.findFirst.mockResolvedValue(orderRecord);

    await expect(service.createOrder(userId, [seatId])).resolves.toMatchObject({
      id: orderId,
      seats: [
        {
          priceSnapshot: 180.5,
          seatId,
        },
      ],
      status: OrderStatus.PENDING,
      totalPrice: 180.5,
    });

    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          eventId,
          status: OrderStatus.PENDING,
          totalPrice: 180.5,
          userId,
        },
      }),
    );
    expect(prisma.orderSeat.createMany).toHaveBeenCalledWith({
      data: [
        {
          orderId,
          priceSnapshot: 180.5,
          seatId,
        },
      ],
    });
  });

  it('rejects order creation for expired or other-user locks', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        ...lockedSeat,
        lockedById: 'e7ff8e52-3cf4-4d21-8479-e78723aaf132',
      },
    ]);

    await expect(service.createOrder(userId, [seatId])).rejects.toBeInstanceOf(
      OrderSeatsInvalidException,
    );

    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('confirms a pending order, sells seats, and creates QR tickets', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ eventId, id: orderId, status: 'pending', userId }])
      .mockResolvedValueOnce([
        {
          id: seatId,
          lockedById: userId,
          lockedUntil: new Date(Date.now() + 60_000),
          status: 'locked',
        },
      ]);
    prisma.orderSeat.findMany.mockResolvedValue([{ seatId }]);
    prisma.seat.updateMany.mockResolvedValue({ count: 1 });
    prisma.ticket.createMany.mockResolvedValue({ count: 1 });
    prisma.order.update.mockResolvedValue({ id: orderId, status: OrderStatus.CONFIRMED });
    prisma.order.findFirst.mockResolvedValue({
      ...orderRecord,
      seats: [
        {
          ...orderRecord.seats[0]!,
          seat: {
            ...orderRecord.seats[0]!.seat,
            status: SeatStatus.SOLD,
          },
        },
      ],
      status: OrderStatus.CONFIRMED,
      tickets: [
        {
          id: 'ticket-id',
          issuedAt: new Date('2026-05-13T00:00:00Z'),
          qrCode: 'data:image/png;base64,qr',
          seatId,
        },
      ],
    });

    await expect(service.confirmOrder(userId, orderId)).resolves.toMatchObject({
      id: orderId,
      status: OrderStatus.CONFIRMED,
      tickets: [
        {
          qrCode: 'data:image/png;base64,qr',
          seatId,
        },
      ],
    });

    expect(prisma.seat.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          lockedById: null,
          lockedUntil: null,
          status: SeatStatus.SOLD,
        },
      }),
    );
    type TicketCreateArg = { data: { orderId: string; qrCode: string; seatId: string }[] };
    const ticketCreateCalls = prisma.ticket.createMany.mock.calls as [[TicketCreateArg]];
    const [[ticketCreateArg]] = ticketCreateCalls;
    const [ticketData] = ticketCreateArg.data;

    expect(ticketCreateArg.data).toHaveLength(1);
    expect(ticketData).toMatchObject({
      orderId,
      seatId,
    });
    expect(ticketData?.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(realtimeUpdatesService.emitSeatLifecycleChanges).toHaveBeenCalledWith(
      eventId,
      [{ eventId, seatId }],
      SeatStatus.SOLD,
    );
  });

  it('rejects confirm when order is missing or not pending', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    await expect(service.confirmOrder(userId, orderId)).rejects.toBeInstanceOf(
      OrderNotFoundException,
    );

    prisma.$queryRaw.mockResolvedValueOnce([{ eventId, id: orderId, status: 'confirmed', userId }]);

    await expect(service.confirmOrder(userId, orderId)).rejects.toBeInstanceOf(
      OrderNotPendingException,
    );
  });

  it('expires a pending order when its seats are no longer confirmable', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ eventId, id: orderId, status: 'pending', userId }])
      .mockResolvedValueOnce([
        {
          id: seatId,
          lockedById: userId,
          lockedUntil: new Date(Date.now() - 60_000),
          status: 'locked',
        },
      ]);
    prisma.orderSeat.findMany.mockResolvedValue([{ seatId }]);
    prisma.order.update.mockResolvedValue({ id: orderId, status: OrderStatus.EXPIRED });

    await expect(service.confirmOrder(userId, orderId)).rejects.toBeInstanceOf(
      OrderExpiredException,
    );

    expect(prisma.order.update).toHaveBeenCalledWith({
      data: { status: OrderStatus.EXPIRED },
      where: { id: orderId },
    });
    expect(prisma.ticket.createMany).not.toHaveBeenCalled();
  });
});
