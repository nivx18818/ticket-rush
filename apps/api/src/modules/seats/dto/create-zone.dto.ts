import { ZoneName } from '@repo/db/prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateZoneDto {
  @IsEnum(ZoneName)
  name!: ZoneName;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rows!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  seatsPerRow!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price!: number;
}
