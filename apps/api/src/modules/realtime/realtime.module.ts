import { Module } from '@nestjs/common';

import { SeatEventsGateway } from './seat-events.gateway';

@Module({
  exports: [SeatEventsGateway],
  providers: [SeatEventsGateway],
})
export class RealtimeModule {}
