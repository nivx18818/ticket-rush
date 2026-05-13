import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';

import {
  AdminEventMutationsController,
  AdminEventsController,
  PublicEventsController,
} from './events.controller';
import { EventsService } from './events.service';

@Module({
  controllers: [PublicEventsController, AdminEventsController, AdminEventMutationsController],
  imports: [PrismaModule],
  providers: [EventsService],
})
export class EventsModule {}
