import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  imports: [PrismaModule, RealtimeModule],
  providers: [OrdersService],
})
export class OrdersModule {}
