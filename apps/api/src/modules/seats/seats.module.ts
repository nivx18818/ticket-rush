import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';

import {
  AdminSeatsController,
  CustomerSeatsController,
  PublicSeatsController,
} from './seats.controller';
import { SeatsService } from './seats.service';

@Module({
  controllers: [AdminSeatsController, CustomerSeatsController, PublicSeatsController],
  imports: [PrismaModule],
  providers: [SeatsService],
})
export class SeatsModule {}
