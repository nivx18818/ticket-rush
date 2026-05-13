import type { SeatDto } from './seat.dto';

export class LockSeatsDto {
  lockedUntil!: Date;
  seats!: SeatDto[];
}
