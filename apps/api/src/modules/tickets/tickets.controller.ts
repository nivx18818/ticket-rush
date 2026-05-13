import { Controller, Get, Param } from '@nestjs/common';
import { UserRole } from '@repo/db/prisma/client';

import type { AuthenticatedRequestUser } from '@/modules/auth/type/auth.types';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import type { TicketDto } from './dto/ticket.dto';

import { TicketsService } from './tickets.service';

@Controller('tickets')
@Roles(UserRole.CUSTOMER)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  listTickets(@CurrentUser() user: AuthenticatedRequestUser): Promise<TicketDto[]> {
    return this.ticketsService.listTickets(user.id);
  }

  @Get(':id')
  getTicket(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<TicketDto> {
    return this.ticketsService.getTicket(user.id, id);
  }
}
