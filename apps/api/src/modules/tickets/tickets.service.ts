import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db/prisma/client';

import { TicketNotFoundException } from '@/common/exceptions/app.exceptions';
import { PrismaService } from '@/modules/prisma/prisma.service';

import type { TicketDto } from './dto/ticket.dto';
import type { TicketRecord } from './types/tickets';

const TICKET_SELECT = {
  id: true,
  issuedAt: true,
  order: {
    select: {
      eventId: true,
    },
  },
  orderId: true,
  qrCode: true,
  seat: {
    select: {
      id: true,
      rowLabel: true,
      seatNumber: true,
      zone: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const satisfies Prisma.TicketSelect;

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTickets(userId: string): Promise<TicketDto[]> {
    const tickets = await this.prisma.ticket.findMany({
      orderBy: { issuedAt: 'desc' },
      select: TICKET_SELECT,
      where: {
        order: {
          userId,
        },
      },
    });

    return tickets.map((ticket) => this.toTicketDto(ticket));
  }

  async getTicket(userId: string, ticketId: string): Promise<TicketDto> {
    const ticket = await this.prisma.ticket.findFirst({
      select: TICKET_SELECT,
      where: {
        id: ticketId,
        order: {
          userId,
        },
      },
    });

    if (!ticket) {
      throw new TicketNotFoundException(ticketId);
    }

    return this.toTicketDto(ticket);
  }

  private toTicketDto(ticket: TicketRecord): TicketDto {
    return {
      eventId: ticket.order.eventId,
      id: ticket.id,
      issuedAt: ticket.issuedAt,
      orderId: ticket.orderId,
      qrCode: ticket.qrCode,
      seat: {
        rowLabel: ticket.seat.rowLabel,
        seatId: ticket.seat.id,
        seatNumber: ticket.seat.seatNumber,
        zoneId: ticket.seat.zone.id,
        zoneName: ticket.seat.zone.name,
      },
    };
  }
}
