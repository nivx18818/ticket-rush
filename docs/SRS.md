# Software Requirements Specification

## TicketRush — Online Ticket Booking Platform

**Course:** INT3306 – Web Application Development, Spring 2026  
**Team size:** 3  
**Demo:** May 11–16, 2026

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [User Roles](#3-user-roles)
4. [Functional Requirements](#4-functional-requirements)
5. [Technical Requirements](#5-technical-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Tech Stack](#7-tech-stack)
8. [System Architecture](#8-system-architecture)
9. [Data Models](#9-data-models)
10. [API Overview](#10-api-overview)

---

## 1. Introduction

### 1.1 Purpose

This document defines the requirements for TicketRush, an online event ticket booking platform built as the major assignment for INT3306. It covers functional scope, technical constraints, chosen technology, and system design to serve as the single reference for the development team.

### 1.2 Scope

TicketRush is a web application allowing a single event organizer (Admin) to publish music/entertainment events with visual seat maps and sell tickets online to audiences (Customers). The core technical challenge is handling high-concurrency flash-sale scenarios — thousands of users competing for a limited number of seats — without data corruption or system failure.

### 1.3 Definitions

| Term          | Meaning                                                              |
| ------------- | -------------------------------------------------------------------- |
| Seat matrix   | A grid declared by Admin (e.g. Zone A: 10 rows × 15 seats)           |
| Lock          | A temporary reservation placed on a seat while a customer checks out |
| Release       | Expiry of a lock; seat returns to Available                          |
| Flash sale    | A ticket sale opened simultaneously to a large number of users       |
| Virtual queue | A waiting room that throttles user access during traffic spikes      |
| QR ticket     | A unique QR code issued to a customer upon successful purchase       |

### 1.4 Out of Scope

- Real payment gateway integration (mock checkout only)
- Email or SMS notifications
- Multi-organizer / multi-tenant support
- Mobile native applications

---

## 2. Overall Description

TicketRush is built and operated by a single event organizer. The organizer uses the Admin interface to create events, define seating zones, and monitor sales in real time. Customers browse public event listings, select seats on a visual map, and complete a mock checkout to receive a QR-coded ticket.

The platform must remain correct and available under flash-sale conditions — the primary technical deliverable of the project.

---

## 3. User Roles

### 3.1 Customer

An unauthenticated or registered audience member who browses events and purchases tickets.

### 3.2 Admin

The system owner and event organizer. Has full control over the platform. Accessed via a protected route with a hardcoded or seeded admin account (no self-registration needed).

---

## 4. Functional Requirements

### 4.1 Customer

#### 4.1.1 Browse & Search Events

- View a list of published events (name, date, venue, thumbnail).
- Search events by keyword (matched against event name). The event list accepts an optional `?q=` query parameter; results are filtered server-side and the UI updates without a full page reload.
- View event detail page including description and seating map.

#### 4.1.2 Seat Map & Selection

- The seat map renders all seats in their configured zones as a grid.
- Each seat displays its current status visually:
  - **Green** — Available
  - **Grey** — Locked by another user
  - **Red** — Sold
- Customer clicks an available seat to select it.
- A customer may select multiple seats in one session (reasonable limit, e.g. 4).
- Seat status updates automatically without page refresh (via WebSocket or polling).

#### 4.1.3 Hold & Checkout

- Clicking "Proceed to checkout" places a **Lock** on all selected seats for **10 minutes**.
- The checkout page displays the order summary (event, seats, total price).
- Pressing **"Confirm Payment"** marks all locked seats as **Sold** and issues QR tickets.
- If the customer does not confirm within 10 minutes, the lock expires and seats are **Released**.

#### 4.1.4 E-Ticket

- After successful checkout, the customer receives a page showing their QR code(s).
- Each QR code encodes a unique ticket ID.
- Tickets are accessible again from the customer's account page (if logged in).

#### 4.1.5 Authentication (Customer)

- Register with name, email, password, date of birth, and gender.
- Log in / log out.
- Unauthenticated users may browse events but must log in to select seats.

### 4.2 Admin

#### 4.2.1 Event Management

- Create a new event: name, description, date, venue, thumbnail image URL.
- Edit or delete an unpublished event.
- Publish / unpublish an event (controls visibility to customers).

#### 4.2.2 Seat Map Configuration

- For each event, define one or more zones (e.g. Zone A, Zone B, VIP).
- For each zone, declare the seat matrix: number of rows and seats per row.
- Assign a price to each zone (all seats in a zone share one price).
- The system generates individual seat records from the matrix declaration.

#### 4.2.3 Real-Time Dashboard

- View live revenue total for each event.
- View live seat occupancy: count and percentage of Available / Locked / Sold seats per zone.
- Data updates in real time without page refresh (WebSocket push from server).

#### 4.2.4 Audience Analytics

- View a breakdown of ticket buyers by age group and gender for each event.
- Derived from registration data collected at customer sign-up.
- Displayed as simple charts (bar or pie).

---

## 5. Technical Requirements

### 5.1 Seat Map — Real-Time Status Sync

The frontend must reflect seat status changes made by other users without requiring a page reload.

**Implementation:** WebSocket connection (Socket.io) between client and server. When a seat status changes (lock, release, or sale), the server emits a `seat:updated` event to all clients viewing that event's seat map. The client updates the seat color in place.

Polling (every 3–5 seconds) is an acceptable fallback if WebSocket implementation becomes a blocker, as the course specification permits either approach.

### 5.2 Database Concurrency — Race Condition Prevention

This is the core correctness requirement. When two users click the same seat simultaneously, exactly one must succeed.

**Implementation:** Every "lock seat" operation must run inside a PostgreSQL transaction using `SELECT FOR UPDATE`:

```sql
BEGIN;
SELECT * FROM seats
  WHERE id = $seatId AND status = 'available'
  FOR UPDATE;          -- row-level lock; second transaction blocks here

UPDATE seats SET status = 'locked', locked_by = $userId,
  locked_until = NOW() + INTERVAL '10 minutes'
  WHERE id = $seatId;
COMMIT;
```

The first transaction acquires the row lock and updates the seat. The second transaction waits, then reads the updated row, finds `status = 'locked'`, and returns an error to the second user. No seat is ever double-booked.

### 5.3 Ticket Lifecycle

Seats transition through the following states:

```
Available ──[customer holds]──► Locked ──[customer confirms]──► Sold
                                   │
                              [10 min timeout]
                                   │
                                Released (= Available)
```

**Auto-release implementation:** A BullMQ delayed job is enqueued at lock time with a 10-minute delay. When the job fires, the worker checks: if the seat is still `locked` and unpaid, it sets `status = 'available'` and emits a `seat:updated` WebSocket event so all connected clients see the seat turn green again.

**Payment:** No real payment gateway. The checkout "Confirm" button calls `POST /orders/:id/confirm`, which flips all locked seats to `sold`, generates QR ticket records, and cancels the pending release jobs.

### 5.4 Virtual Queue (Advanced Feature)

When concurrent seat-lock requests exceed a configurable threshold, the system activates a waiting room instead of letting all requests hit the database simultaneously.

**Flow:**

1. On flash-sale open, incoming users are redirected to `/queue` if the active session count exceeds the threshold.
2. Each user is assigned a position stored in a Redis sorted set (score = arrival timestamp).
3. The queue page displays: _"You are #105 in the queue. Please do not refresh."_
4. A server-side scheduler (BullMQ repeatable job) runs every few seconds and dequeues the next batch of N users (e.g. 50), issuing each a signed access token (JWT with short expiry).
5. Clients poll a `/queue/status` endpoint. When their token is issued, they are redirected to the seat map with the token as a query param.
6. The seat map route validates the token before granting access.

**Redis data structure:**

```
ZADD queue:{eventId}  <timestamp>  <userId>   // enqueue
ZRANGE queue:{eventId} 0 49 WITHSCORES        // dequeue next 50
ZRANK queue:{eventId} <userId>                // get position
```

---

## 6. Non-Functional Requirements

Only those relevant to a course project demo are listed.

| #     | Requirement                   | Target                                                                                                     |
| ----- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| NFR-1 | Correctness under concurrency | Zero double-bookings under concurrent load (verifiable with a simple script sending simultaneous requests) |
| NFR-2 | Seat status update latency    | Seat turns grey on other clients within 2 seconds of a lock                                                |
| NFR-3 | Lock expiry accuracy          | Seats released within 30 seconds of the 10-minute deadline                                                 |
| NFR-4 | Auth security                 | Passwords hashed with bcrypt; JWT used for session                                                         |
| NFR-5 | Dev environment               | Single `docker compose up` starts all services                                                             |

---

## 7. Tech Stack

### 7.1 Summary

| Layer               | Technology                             | Reason                                                                              |
| ------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Frontend            | Next.js 14 (App Router)                | React-based, file-based routing, same language as backend                           |
| Backend             | NestJS (Node.js)                       | Enforced structure for team collaboration; first-class Socket.io and BullMQ modules |
| Database            | PostgreSQL 16                          | Row-level locking (`SELECT FOR UPDATE`) — mandatory for correctness requirement     |
| Cache & Queue store | Redis 7                                | Backs BullMQ job queues and virtual queue sorted sets                               |
| Background jobs     | BullMQ via `@nestjs/bull`              | Delayed seat-release jobs; repeatable queue-drain jobs                              |
| Real-time           | Socket.io via `@nestjs/websockets`     | Seat map sync and admin dashboard push                                              |
| Auth                | JWT via `@nestjs/jwt` + `passport-jwt` | Stateless, simple to implement                                                      |
| QR generation       | `qrcode` (npm)                         | Server-side QR PNG generation, no external service                                  |
| Containerisation    | Docker + Docker Compose                | Uniform dev environment across all team members                                     |

### 7.2 Next.js (Frontend)

Next.js handles all UI: event listing, seat map, checkout, QR ticket display, and admin pages. The App Router is used. The frontend communicates with NestJS over HTTP (REST) and WebSocket (Socket.io).

Next.js API Routes are **not** used for backend logic — all business logic lives in NestJS. Next.js is purely UI.

### 7.3 NestJS (Backend)

Modules align with the domain:

```
src/
  auth/          ← JWT strategy, guards, register/login endpoints
  users/         ← customer profile, analytics data
  events/        ← event CRUD, publish/unpublish
  seats/         ← seat matrix generation, lock/release/sell logic
  orders/        ← checkout, confirm, QR ticket issuance
  queue/         ← virtual queue management
  dashboard/     ← real-time stats aggregation
  workers/       ← BullMQ processors (seat release, queue drain)
  gateway/       ← Socket.io WebSocket gateway
```

### 7.4 PostgreSQL

All persistent data lives here. Row-level locking is used for the seat-hold transaction. No ORM — queries are written with `pg` (node-postgres) directly to keep SQL transparent and avoid ORM magic hiding the locking behaviour.

### 7.5 Redis

- BullMQ uses Redis as its job store (delayed jobs for seat release, repeatable job for queue drain).
- Virtual queue positions stored as a sorted set per event.
- No general-purpose caching needed beyond these two uses.

### 7.6 Docker Compose

Five services:

```yaml
services:
  frontend: # Next.js dev server, port 3000
  backend: # NestJS, port 4000
  worker: # BullMQ processors (same NestJS codebase, different entry point)
  postgres: # PostgreSQL 16
  redis: # Redis 7
```

---

## 8. System Architecture

### 8.1 Request Flow — Seat Lock

```
Customer clicks seat
       │
       ▼
Next.js → POST /seats/:id/lock  (with JWT)
       │
       ▼
NestJS SeatsController
       │
       ▼
SeatsService.lockSeat()
  ├─ BEGIN transaction
  ├─ SELECT ... FOR UPDATE   (blocks concurrent requests)
  ├─ Check status = 'available'
  ├─ UPDATE status = 'locked', locked_until = now + 10min
  ├─ COMMIT
  ├─ Enqueue BullMQ delayed job (10 min)
  └─ Emit socket event  seat:updated → all clients on this event
       │
       ▼
Client seat turns grey instantly
Other clients' seats turn grey within seconds
```

### 8.2 Request Flow — Auto Release

```
BullMQ delayed job fires after 10 min
       │
       ▼
SeatReleaseProcessor.process()
  ├─ SELECT seat WHERE id = ? AND status = 'locked'
  ├─ If still locked → UPDATE status = 'available'
  └─ Emit seat:updated → all clients
```

### 8.3 Request Flow — Virtual Queue

```
Flash sale opens, traffic spike detected
       │
       ▼
QueueGuard on GET /events/:id/seats
  ├─ Count active sessions for event
  ├─ If below threshold → pass through
  └─ If above threshold → redirect to /queue?event=:id
       │
       ▼
Client assigned position in Redis sorted set
Client polls GET /queue/status every 3 sec
       │
       ▼
QueueDrainJob (repeatable, every 5 sec)
  └─ ZRANGE next 50 users → issue each a short-lived JWT
       │
       ▼
Client receives token → redirect to seat map
```

---

## 9. Data Models

### 9.1 users

| Column        | Type                      | Notes                     |
| ------------- | ------------------------- | ------------------------- |
| id            | uuid PK                   |                           |
| email         | varchar unique            |                           |
| password_hash | varchar                   | bcrypt                    |
| name          | varchar                   |                           |
| date_of_birth | date                      | used for age analytics    |
| gender        | enum(male, female, other) | used for gender analytics |
| role          | enum(customer, admin)     |                           |
| created_at    | timestamptz               |                           |

### 9.2 events

| Column        | Type                   | Notes |
| ------------- | ---------------------- | ----- |
| id            | uuid PK                |       |
| name          | varchar                |       |
| description   | text                   |       |
| event_date    | timestamptz            |       |
| venue         | varchar                |       |
| thumbnail_url | varchar                |       |
| status        | enum(draft, published) |       |
| created_at    | timestamptz            |       |

### 9.3 zones

| Column        | Type             | Notes                              |
| ------------- | ---------------- | ---------------------------------- |
| id            | uuid PK          |                                    |
| event_id      | uuid FK → events |                                    |
| name          | varchar          | e.g. "Zone A", "VIP"               |
| rows          | int              | seat matrix row count              |
| seats_per_row | int              | seat matrix column count           |
| price         | numeric          | all seats in zone share this price |

### 9.4 seats

| Column       | Type                          | Notes                |
| ------------ | ----------------------------- | -------------------- |
| id           | uuid PK                       |                      |
| zone_id      | uuid FK → zones               |                      |
| row_label    | varchar                       | e.g. "A", "B"        |
| seat_number  | int                           | e.g. 1–15            |
| status       | enum(available, locked, sold) | the lifecycle column |
| locked_by    | uuid FK → users nullable      |                      |
| locked_until | timestamptz nullable          |                      |

### 9.5 orders

| Column      | Type                              | Notes |
| ----------- | --------------------------------- | ----- |
| id          | uuid PK                           |       |
| user_id     | uuid FK → users                   |       |
| event_id    | uuid FK → events                  |       |
| status      | enum(pending, confirmed, expired) |       |
| total_price | numeric                           |       |
| created_at  | timestamptz                       |       |

### 9.6 tickets

| Column    | Type             | Notes                    |
| --------- | ---------------- | ------------------------ |
| id        | uuid PK          | also encoded in QR       |
| order_id  | uuid FK → orders |                          |
| seat_id   | uuid FK → seats  |                          |
| qr_code   | text             | base64 PNG or SVG string |
| issued_at | timestamptz      |                          |

---

## 10. API Overview

All endpoints are prefixed `/api`. Auth-required endpoints need `Authorization: Bearer <token>`.

### Auth

| Method | Path           | Auth | Description           |
| ------ | -------------- | ---- | --------------------- |
| POST   | /auth/register | None | Customer registration |
| POST   | /auth/login    | None | Returns JWT           |

### Events

| Method | Path                | Auth  | Description                                             |
| ------ | ------------------- | ----- | ------------------------------------------------------- |
| GET    | /events             | None  | List published events; accepts `?q=` for keyword search |
| GET    | /events/:id         | None  | Event detail + zone list                                |
| POST   | /events             | Admin | Create event                                            |
| PATCH  | /events/:id         | Admin | Update event                                            |
| PATCH  | /events/:id/publish | Admin | Publish / unpublish                                     |

### Zones & Seats

| Method | Path              | Auth     | Description                               |
| ------ | ----------------- | -------- | ----------------------------------------- |
| POST   | /events/:id/zones | Admin    | Create zone + generate seats              |
| GET    | /events/:id/seats | None     | All seats with current status             |
| POST   | /seats/lock       | Customer | Lock selected seats → starts 10-min timer |
| POST   | /seats/release    | Customer | Manually release before checkout          |

### Orders

| Method | Path                | Auth     | Description                                       |
| ------ | ------------------- | -------- | ------------------------------------------------- |
| POST   | /orders             | Customer | Create order from locked seats                    |
| GET    | /orders/:id         | Customer | Order detail                                      |
| POST   | /orders/:id/confirm | Customer | Mock payment → status = confirmed, issues tickets |

### Tickets

| Method | Path         | Auth     | Description             |
| ------ | ------------ | -------- | ----------------------- |
| GET    | /tickets     | Customer | List own tickets        |
| GET    | /tickets/:id | Customer | Single ticket + QR code |

### Dashboard (Admin)

| Method | Path                            | Auth  | Description                  |
| ------ | ------------------------------- | ----- | ---------------------------- |
| GET    | /dashboard/events/:id           | Admin | Revenue + occupancy snapshot |
| GET    | /dashboard/events/:id/analytics | Admin | Age + gender breakdown       |

### Queue

| Method | Path          | Auth     | Description                     |
| ------ | ------------- | -------- | ------------------------------- |
| POST   | /queue/join   | Customer | Join virtual queue for an event |
| GET    | /queue/status | Customer | Poll position + token readiness |

### WebSocket Events (Socket.io)

| Event               | Direction       | Payload                           | Description                  |
| ------------------- | --------------- | --------------------------------- | ---------------------------- |
| `seat:updated`      | Server → Client | `{ seatId, status }`              | Seat status changed          |
| `dashboard:updated` | Server → Client | `{ eventId, revenue, occupancy }` | Live admin dashboard refresh |
