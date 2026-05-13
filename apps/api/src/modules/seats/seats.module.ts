import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';

import { AdminSeatsController, PublicSeatsController } from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  controllers: [AdminSeatsController, PublicSeatsController],
  imports: [PrismaModule],
  providers: [SeatsService],
})
export class SeatsModule {}
