import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Socket } from 'socket.io-client';

import { Test } from '@nestjs/testing';
import { SeatStatus, ZoneName } from '@repo/db/prisma/client';
import { io } from 'socket.io-client';

import type {
  DashboardUpdatedEventPayload,
  SeatUpdatedEventPayload,
} from '@/modules/realtime/types/seat-events';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { RealtimeUpdatesService } from '@/modules/realtime/realtime-updates.service';
import { RealtimeModule } from '@/modules/realtime/realtime.module';

type RealtimeEvent =
  | {
      event: 'dashboard:updated';
      payload: DashboardUpdatedEventPayload;
    }
  | {
      event: 'seat:updated';
      payload: SeatUpdatedEventPayload;
    };

describe('Realtime gateway (e2e)', () => {
  const eventId = 'd2a40ead-449c-4b67-bc56-149898ac1127';
  const seatId = '3b389a53-5557-4cd3-80db-f42b772a1887';
  const zoneId = '4dd05fbf-fb23-4fb0-9828-15fe05f3ac14';

  const prisma = {
    $queryRaw: jest.fn(),
  };

  let app: INestApplication;
  let client: Socket;
  let realtimeUpdatesService: RealtimeUpdatesService;

  beforeEach(async () => {
    jest.resetAllMocks();

    prisma.$queryRaw.mockResolvedValue([
      {
        availableCount: 2,
        lockedCount: 1,
        revenue: { toString: () => '180.50' },
        soldCount: 1,
        zoneId,
        zoneName: ZoneName.VIP,
      },
    ]);

    const moduleRef = await Test.createTestingModule({
      imports: [RealtimeModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);

    realtimeUpdatesService = moduleRef.get(RealtimeUpdatesService);
    client = await connectClient(getServerUrl(app));
  });

  afterEach(async () => {
    client.disconnect();
    await app.close();
  });

  it('emits seat and dashboard updates to socket clients within two seconds', async () => {
    const realtimeEventsPromise = collectRealtimeEvents(client);
    const startedAt = Date.now();

    await realtimeUpdatesService.emitSeatLifecycleChanges(
      eventId,
      [{ eventId, seatId }],
      SeatStatus.LOCKED,
    );

    const realtimeEvents = await realtimeEventsPromise;

    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(realtimeEvents).toEqual([
      {
        event: 'seat:updated',
        payload: {
          eventId,
          seatId,
          status: SeatStatus.LOCKED,
        },
      },
      {
        event: 'dashboard:updated',
        payload: {
          eventId,
          occupancy: {
            totals: {
              available: 2,
              availablePercentage: 50,
              locked: 1,
              lockedPercentage: 25,
              sold: 1,
              soldPercentage: 25,
              total: 4,
            },
            zones: [
              {
                available: 2,
                availablePercentage: 50,
                locked: 1,
                lockedPercentage: 25,
                sold: 1,
                soldPercentage: 25,
                total: 4,
                zoneId,
                zoneName: ZoneName.VIP,
              },
            ],
          },
          revenue: 180.5,
        },
      },
    ]);
  });
});

function collectRealtimeEvents(client: Socket): Promise<RealtimeEvent[]> {
  const realtimeEvents: RealtimeEvent[] = [];

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for realtime events: ${JSON.stringify(realtimeEvents)}`));
    }, 2_000);

    const cleanup = () => {
      clearTimeout(timeout);
      client.off('seat:updated', onSeatUpdated);
      client.off('dashboard:updated', onDashboardUpdated);
    };

    const pushEvent = (event: RealtimeEvent): void => {
      realtimeEvents.push(event);

      if (realtimeEvents.length === 2) {
        cleanup();
        resolve(realtimeEvents);
      }
    };

    const onSeatUpdated = (payload: SeatUpdatedEventPayload): void => {
      pushEvent({ event: 'seat:updated', payload });
    };

    const onDashboardUpdated = (payload: DashboardUpdatedEventPayload): void => {
      pushEvent({ event: 'dashboard:updated', payload });
    };

    client.once('seat:updated', onSeatUpdated);
    client.once('dashboard:updated', onDashboardUpdated);
  });
}

function connectClient(url: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const client = io(url, {
      forceNew: true,
      transports: ['websocket'],
    });

    const timeout = setTimeout(() => {
      client.disconnect();
      reject(new Error('Timed out connecting to realtime gateway.'));
    }, 2_000);

    client.once('connect', () => {
      clearTimeout(timeout);
      resolve(client);
    });

    client.once('connect_error', (error) => {
      clearTimeout(timeout);
      client.disconnect();
      reject(error);
    });
  });
}

function getServerUrl(app: INestApplication): string {
  const server = app.getHttpServer() as Server;
  const address = server.address() as AddressInfo;

  return `http://127.0.0.1:${address.port}`;
}
