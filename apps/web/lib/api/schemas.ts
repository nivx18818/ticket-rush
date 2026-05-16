import { z } from 'zod';

const dateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date;
  }

  return value;
}, z.date());

export const eventStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

export const messageSchema = z.object({
  message: z.string(),
});

export const orderStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'EXPIRED']);

export const seatStatusSchema = z.enum(['AVAILABLE', 'LOCKED', 'SOLD']);

export const userGenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);

export const userRoleSchema = z.enum(['CUSTOMER', 'ADMIN']);

export const zoneNameSchema = z.enum([
  'BALCONY_LEFT',
  'BALCONY_RIGHT',
  'STANDING',
  'VIP',
  'ZONE_A',
  'ZONE_B',
  'ZONE_C',
]);

export const eventSchema = z.object({
  createdAt: dateSchema,
  description: z.string(),
  eventDate: dateSchema,
  id: z.uuid(),
  name: z.string(),
  status: eventStatusSchema,
  thumbnailUrl: z.string(),
  venue: z.string(),
});

export const seatSchema = z.object({
  id: z.uuid(),
  price: z.number(),
  rowLabel: z.string(),
  seatNumber: z.number(),
  status: seatStatusSchema,
  zoneId: z.uuid(),
  zoneName: zoneNameSchema,
});

export const lockSeatsSchema = z.object({
  lockedUntil: dateSchema,
  seats: z.array(seatSchema),
});

export const releaseSeatsSchema = z.object({
  releasedCount: z.number(),
});

export const orderSeatSchema = z.object({
  priceSnapshot: z.number(),
  rowLabel: z.string(),
  seatId: z.uuid(),
  seatNumber: z.number(),
  seatStatus: seatStatusSchema,
  zoneId: z.uuid(),
  zoneName: zoneNameSchema,
});

export const orderTicketSchema = z.object({
  id: z.uuid(),
  issuedAt: dateSchema,
  qrCode: z.string(),
  seatId: z.uuid(),
});

export const orderSchema = z.object({
  createdAt: dateSchema,
  eventId: z.uuid(),
  id: z.uuid(),
  seats: z.array(orderSeatSchema),
  status: orderStatusSchema,
  tickets: z.array(orderTicketSchema),
  totalPrice: z.number(),
  userId: z.uuid(),
});

export const ticketSeatSchema = z.object({
  rowLabel: z.string(),
  seatId: z.uuid(),
  seatNumber: z.number(),
  zoneId: z.uuid(),
  zoneName: zoneNameSchema,
});

export const ticketSchema = z.object({
  eventId: z.uuid(),
  id: z.uuid(),
  issuedAt: dateSchema,
  orderId: z.uuid(),
  qrCode: z.string(),
  seat: ticketSeatSchema,
});

export const userProfileSchema = z.object({
  createdAt: dateSchema,
  dateOfBirth: dateSchema,
  email: z.email(),
  gender: userGenderSchema,
  id: z.uuid(),
  name: z.string(),
  role: userRoleSchema,
});

export const currentUserSchema = z.object({
  user: userProfileSchema,
});

export const seatUpdatedEventSchema = z.object({
  eventId: z.uuid(),
  seatId: z.uuid(),
  status: seatStatusSchema,
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
export type Event = z.infer<typeof eventSchema>;
export type LockSeats = z.infer<typeof lockSeatsSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type ReleaseSeats = z.infer<typeof releaseSeatsSchema>;
export type Seat = z.infer<typeof seatSchema>;
export type SeatStatus = z.infer<typeof seatStatusSchema>;
export type SeatUpdatedEvent = z.infer<typeof seatUpdatedEventSchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type UserGender = z.infer<typeof userGenderSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type ZoneName = z.infer<typeof zoneNameSchema>;
