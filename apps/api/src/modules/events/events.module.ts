import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';

import { AdminEventsController, PublicEventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  controllers: [PublicEventsController, AdminEventsController],
  imports: [PrismaModule],
  providers: [EventsService],
})
export class EventsModule {}
