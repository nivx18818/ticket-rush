import { z } from 'zod';

import type { ApiRequestInit } from './request';
import type { userGenderSchema } from './schemas';

import {
  currentUserSchema,
  eventSchema,
  lockSeatsSchema,
  messageSchema,
  orderSchema,
  releaseSeatsSchema,
  seatSchema,
  ticketSchema,
  userProfileSchema,
} from './schemas';

export type ApiFetch = <TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  init?: ApiRequestInit,
) => Promise<z.infer<TSchema>>;

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  dateOfBirth: Date | string;
  gender: z.infer<typeof userGenderSchema>;
  name: string;
};

export function createTicketRushApi(fetchJson: ApiFetch) {
  return {
    cancelOrder: (orderId: string) =>
      fetchJson(`/orders/${orderId}/cancel`, orderSchema, {
        method: 'POST',
      }),
    confirmOrder: (orderId: string) =>
      fetchJson(`/orders/${orderId}/confirm`, orderSchema, {
        method: 'POST',
      }),
    createOrder: (seatIds: string[]) =>
      fetchJson('/orders', orderSchema, {
        body: { seatIds },
        method: 'POST',
      }),
    getEvent: (eventId: string) => fetchJson(`/events/${eventId}`, eventSchema),
    getMe: () => fetchJson('/auth/me', currentUserSchema),
    getOrder: (orderId: string) => fetchJson(`/orders/${orderId}`, orderSchema),
    getTicket: (ticketId: string) => fetchJson(`/tickets/${ticketId}`, ticketSchema),
    listEventSeats: (eventId: string) => fetchJson(`/events/${eventId}/seats`, z.array(seatSchema)),
    listEvents: (query?: { q?: string }) =>
      fetchJson(buildEventsPath(query?.q), z.array(eventSchema), {
        method: 'GET',
      }),
    listTickets: () => fetchJson('/tickets', z.array(ticketSchema)),
    lockSeats: (seatIds: string[]) =>
      fetchJson('/seats/lock', lockSeatsSchema, {
        body: { seatIds },
        method: 'POST',
      }),
    login: (input: LoginInput) =>
      fetchJson('/auth/login', messageSchema, {
        body: input,
        method: 'POST',
      }),
    logout: () =>
      fetchJson('/auth/logout', messageSchema, {
        method: 'POST',
      }),
    refreshSession: () =>
      fetchJson('/auth/refresh', messageSchema, {
        method: 'POST',
      }),
    register: (input: RegisterInput) =>
      fetchJson('/auth/register', userProfileSchema, {
        body: input,
        method: 'POST',
      }),
    releaseSeats: (seatIds: string[]) =>
      fetchJson('/seats/release', releaseSeatsSchema, {
        body: { seatIds },
        method: 'POST',
      }),
  };
}

function buildEventsPath(query: string | undefined): string {
  const params = new URLSearchParams();
  const trimmedQuery = query?.trim();

  if (trimmedQuery) {
    params.set('q', trimmedQuery);
  }

  const serializedParams = params.toString();

  return serializedParams ? `/events?${serializedParams}` : '/events';
}
