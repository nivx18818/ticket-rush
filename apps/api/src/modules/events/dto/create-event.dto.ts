import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @Type(() => Date)
  @IsDate()
  eventDate!: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  venue!: string;

  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  thumbnailUrl!: string;
}
