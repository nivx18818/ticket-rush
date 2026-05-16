import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';

import { OrderExpiryService } from './order-expiry.service';
import { SeatLockExpiryService } from './seat-lock-expiry.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [SeatLockExpiryService, OrderExpiryService],
})
export class CronModule {}
