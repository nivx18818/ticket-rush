import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { UserRole } from '@repo/db/prisma/client';

import type { AuthenticatedRequestUser } from '@/modules/auth/types/auth';

import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@Roles(UserRole.CUSTOMER)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDto> {
    return this.ordersService.createOrder(user.id, dto.seatIds);
  }

  @Get(':id')
  getOrder(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<OrderDto> {
    return this.ordersService.getOrder(user.id, id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<OrderDto> {
    return this.ordersService.confirmOrder(user.id, id);
  }
}
