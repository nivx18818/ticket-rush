import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';

import { LockExpiryService } from './lock-expiry.service';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [LockExpiryService],
})
export class CronModule {}
