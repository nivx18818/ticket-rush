import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';

import {
  AdminSeatsController,
  CustomerSeatsController,
  PublicSeatsController,
} from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  controllers: [AdminSeatsController, CustomerSeatsController, PublicSeatsController],
  imports: [PrismaModule, RealtimeModule],
  providers: [SeatsService],
})
export class SeatsModule {}
