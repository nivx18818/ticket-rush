import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { AppController } from '@/app.controller';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { AuthModule } from '@/modules/auth/auth.module';
import { EventsModule } from '@/modules/events/events.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { SeatsModule } from '@/modules/seats/seats.module';
import { TicketsModule } from '@/modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['apps/api/.env', '.env'],
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    EventsModule,
    OrdersModule,
    SeatsModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
