import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import type { DashboardUpdatedEventPayload, SeatUpdatedEventPayload } from '../types/seat-events';

type EventEmitterServer = {
  emit(event: 'dashboard:updated', payload: DashboardUpdatedEventPayload): void;
  emit(event: 'seat:updated', payload: SeatUpdatedEventPayload): void;
};

@Injectable()
@WebSocketGateway({
  cors: {
    credentials: true,
    origin: true,
  },
})
export class SeatEventsGateway {
  @WebSocketServer()
  private readonly server?: EventEmitterServer;

  emitSeatUpdated(payload: SeatUpdatedEventPayload): void {
    this.server?.emit('seat:updated', payload);
  }

  emitDashboardUpdated(payload: DashboardUpdatedEventPayload): void {
    this.server?.emit('dashboard:updated', payload);
  }
}
