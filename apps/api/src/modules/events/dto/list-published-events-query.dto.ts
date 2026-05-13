import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const normalizeSearchQuery = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

export class ListPublishedEventsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(normalizeSearchQuery)
  q?: string;
}
