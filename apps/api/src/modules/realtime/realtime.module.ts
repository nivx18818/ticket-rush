import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';

import { SeatEventsGateway } from './gateways/seat-events.gateway';
import { RealtimeUpdatesService } from './realtime-updates.service';

@Module({
  exports: [RealtimeUpdatesService, SeatEventsGateway],
  imports: [PrismaModule],
  providers: [RealtimeUpdatesService, SeatEventsGateway],
})
export class RealtimeModule {}
