import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@repo/db/prisma/client';

import type { UserProfileDto } from './dto/users.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('admin/users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(): Promise<UserProfileDto[]> {
    return this.usersService.findAllProfiles();
  }
}
