import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@repo/db/prisma/client';

import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import type { EventDto } from './dto/event.dto';

import { CreateEventDto } from './dto/create-event.dto';
import { ListPublishedEventsQueryDto } from './dto/list-published-events-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class PublicEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get()
  findPublished(@Query() query: ListPublishedEventsQueryDto): Promise<EventDto[]> {
    return this.eventsService.findPublished(query.q);
  }

  @Public()
  @Get(':id')
  getPublishedEvent(@Param('id') id: string): Promise<EventDto> {
    return this.eventsService.getPublishedEvent(id);
  }
}

@Controller('admin/events')
@Roles(UserRole.ADMIN)
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(): Promise<EventDto[]> {
    return this.eventsService.findAllForAdmin();
  }

  @Get(':id')
  getEvent(@Param('id') id: string): Promise<EventDto> {
    return this.eventsService.getAdminEvent(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEventDto): Promise<EventDto> {
    return this.eventsService.createDraft(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto): Promise<EventDto> {
    return this.eventsService.updateDraft(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.eventsService.deleteDraft(id);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string): Promise<EventDto> {
    return this.eventsService.publish(id);
  }

  @Patch(':id/unpublish')
  unpublish(@Param('id') id: string): Promise<EventDto> {
    return this.eventsService.unpublish(id);
  }
}

@Controller('events')
@Roles(UserRole.ADMIN)
export class AdminEventMutationsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEventDto): Promise<EventDto> {
    return this.eventsService.createDraft(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto): Promise<EventDto> {
    return this.eventsService.updateDraft(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.eventsService.deleteDraft(id);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string): Promise<EventDto> {
    return this.eventsService.publish(id);
  }

  @Patch(':id/unpublish')
  unpublish(@Param('id') id: string): Promise<EventDto> {
    return this.eventsService.unpublish(id);
  }
}
