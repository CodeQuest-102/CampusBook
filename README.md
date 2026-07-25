# CampusBook

A lecture-hall booking system for KNUST. Students leaders and lecturers browse
rooms and request bookings; administrators approve/reject requests, manage rooms
and users, and view analytics. Billing follows a freemium, institution-level
subscription model (individual users are never charged).

- **Backend** — Spring Boot 3 (Java 21) + PostgreSQL, JWT auth
- **Frontend** — React Native / Expo (SDK 51), React Navigation, TypeScript

## Features

- **Auth** — register / login (email or staff-student ID), JWT, password reset by
  emailed one-time code, profile editing, rate-limited auth endpoints
- **Rooms (halls)** — browse, details, admin CRUD, time-based availability, and
  server-side search / filtering (capacity, equipment, free-in-a-time-window)
- **Bookings** — create with purpose / attendance / notes, conflict detection,
  recurring weekly series, reschedule (re-approval), cancel; admin approve /
  reject, plus **bulk approve / reject** with per-request outcomes. Two people
  may compete for a slot — that's what the approval queue decides — but the same
  person can't file the same request twice, and a refused approval names the
  booking holding the slot so the admin can reject-and-notify in one step
- **Audit trail** — every booking state change records who acted, when and why,
  shown as a timeline on the booking and request detail screens
- **Calendar export** — a booking, or all your approved bookings, as an `.ics`
  file for Apple / Google / Outlook Calendar
- **Notifications** — in-app, per user, paginated, with unread counts
- **Analytics** — most-booked room, peak day, utilization, bookings-over-time,
  CSV export (Campus Pro)
- **Subscription** — Free / Campus Pro / Enterprise tiers with enforced limits
  and a simulated in-app upgrade (admin, institution-scoped)

All data is **scoped to the acting user's institution** — an admin at one campus
can neither see nor act on another campus's rooms, requests or reports.

## Roles & tiers

| Role | Backend enum | Can |
|------|--------------|-----|
| Student leader | `STUDENT_LEADER` | browse, book, manage own bookings |
| Lecturer | `LECTURER` | same as student leader |
| Admin | `ADMIN` | approve/reject, manage rooms & users, analytics, subscription |

| Tier | Price | Limits / features |
|------|-------|-------------------|
| Free | GHS 0/mo | 5 rooms (maintenance included), 20 bookings/month, basic workflow |
| Campus Pro | GHS 500/mo | unlimited rooms & bookings, analytics dashboard |
| Enterprise | Custom | multi-campus, API integrations, SLA (contact sales) |

## Roles & Tiers

| Role | Access Level | Permissions |
|------|--------------|-------------|
| Student Leader | STUDENT_LEADER | Browse rooms, make bookings |
| Lecturer | LECTURER | Same access as Student Leader |
| Admin | ADMIN | Approve/reject bookings, manage rooms and users, view analytics, manage subscriptions |

## Project structure

```
CampusBook/
├── backend/    Spring Boot API (controllers, services, security, subscription)
└── frontend/   Expo app (src/api, src/screens, src/navigation, src/components)
```

## Prerequisites

- Java 21, Maven (the `./mvnw` wrapper is included)
- PostgreSQL 14+
- Node.js 18+ and the Expo tooling (`npx expo`)
- Xcode (iOS simulator) or Android Studio (emulator), or the Expo Go app

## Setup

### 1. Database

```sql
CREATE DATABASE campusbook;
CREATE USER campusbook_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE campusbook TO campusbook_user;
```

The backend uses these defaults; override with env vars (see below) if different.

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run       # starts on http://localhost:8080
```

Flyway applies the schema from `backend/src/main/resources/db/migration` on
startup (Hibernate runs in `validate` mode — it never alters the schema itself).
The seeder then adds an institution, demo rooms, demo users, and demo bookings.
API docs (Swagger UI): http://localhost:8080/swagger-ui.html

> **Password reset in development:** email is off by default (`MAIL_ENABLED=false`),
> so the one-time reset code is **printed to the backend console** in a banner.
> That keeps the whole reset flow demoable without an SMTP account.

### 3. Frontend

```bash
cd frontend
npm install
npx expo start               # press "i" for iOS simulator, "a" for Android
```

The iOS simulator reaches the backend at `localhost:8080` automatically. For a
**physical device**, set `EXPO_PUBLIC_API_URL` to your machine's LAN IP — see
`frontend/.env.example`.

## Seeded demo logins

| Role | Email | Staff / Student ID | Password |
|------|-------|--------------------|----------|
| Admin | `admin@campusbook.local` | `ADMIN001` | `admin12345` |
| Lecturer | `lecturer@campusbook.local` | `200912345` | `lecturer12345` |
| Student | `student@campusbook.local` | `20551234` | `student12345` |

Either the email or the ID works as the login handle. KNUST IDs are **8 digits for
students, 9 for staff** — enforced on sign-up by both the app and the API. Admin
accounts are provisioned rather than self-registered, so they're exempt.

## Configuration (env vars)

Both apps run with sensible dev defaults and need no env vars locally. For shared
or production environments, set them — see `backend/.env.example` and
`frontend/.env.example`. **Always override `JWT_SECRET` and the DB credentials
outside local development.**

Backend: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`,
`CORS_ALLOWED_ORIGINS`, `SERVER_PORT`, and for email
`MAIL_ENABLED`, `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`.
Frontend: `EXPO_PUBLIC_API_URL`.

### Production profile

Run with `SPRING_PROFILES_ACTIVE=prod` in any real deployment. It turns off SQL
logging and Swagger, stops Flyway from baselining an unknown schema, and — via
`ProductionConfigGuard` — **refuses to start** if `JWT_SECRET` is still the bundled
development default or `CORS_ALLOWED_ORIGINS` is `*`. A crash at boot is
deliberate: it's better than quietly running an insecure instance.

## Testing

```bash
cd backend  && ./mvnw test          # JUnit + Mockito + MockMvc (needs PostgreSQL running)
cd frontend && npm test             # Jest
cd frontend && npx tsc --noEmit     # type-check
```

The backend suite includes `AuthorizationIntegrationTest`, which drives the real
security chain with real JWTs to prove the role gates hold over HTTP (a student
gets 403 on admin endpoints, an anonymous caller gets 401, `role: ADMIN` can't be
self-registered).

## API overview

All endpoints except `/api/auth/**` require `Authorization: Bearer <token>`.
A missing, invalid or expired token returns **401**; a valid token without the
required role returns **403**.

**Auth**
- `POST /api/auth/{register,login}`
- `POST /api/auth/forgot-password` — always 204, so it can't be used to probe
  which accounts exist
- `POST /api/auth/reset-password` — `{ emailOrId, otp, newPassword }`

**Halls**
- `GET /api/halls` — optional filters: `q`, `minCapacity`, `projector`, `ac`,
  `microphone`, and `freeFrom`+`freeUntil` (supply both) for availability
- `GET /api/halls/{id}`, `GET /api/halls/{id}/availability?date=` — occupied
  slots for a day, shown on Room Details and the booking form **without** naming
  who booked them
- `POST/PUT /api/halls…`, `GET /api/halls/admin` (admin)
- `PATCH /api/halls/{id}/active` — `{ active }`, the maintenance toggle
- `DELETE /api/halls/{id}` — removes the room for good; **400** if it has any
  bookings (use maintenance for those, so the history keeps pointing somewhere)

**Bookings**
- `POST /api/bookings`, `POST /api/bookings/recurring`
- `GET /api/bookings/my`, `GET /api/bookings`, `/pending` (admin)
- `POST /api/bookings/{id}/{approve,reject,cancel}`, `PUT /{id}/reschedule`
- `POST /api/bookings/{bulk-approve,bulk-reject}` (admin) — returns
  `{ requested, succeeded[], failed[{id, reason}] }`; individual ids can fail
- `GET /api/bookings/{id}/history` — audit trail
- `GET /api/bookings/{id}/conflicts` (admin) — approved + pending bookings
  competing for the same room and window, so a clash is visible before deciding
- `GET /api/bookings/{id}/calendar.ics`, `GET /api/bookings/my/calendar.ics`

**Other**
- `GET /api/notifications?page=&size=` — paginated
  (`{ content, page, size, totalElements, totalPages, last }`, default 20, max 100);
  `/unread-count`, `PATCH /{id}/read`, `/read-all`
- `GET/PATCH /api/users/me`
- `GET /api/users` (admin) — the directory for the caller's **own institution**
- `POST /api/users` (admin) — provision an account at the caller's institution;
  unlike public sign-up this may create another `ADMIN`
- `GET /api/reports/overview`, `/summary`, `/export` (Campus Pro)
- `GET /api/subscription`, `/plans`, `POST /api/subscription/upgrade` (admin)

## Database migrations

The schema is owned by Flyway (`backend/src/main/resources/db/migration`), not by
Hibernate — `ddl-auto` is `validate`, so entity/schema drift fails at startup
rather than being silently applied. Add changes as a new `V<n>__description.sql`;
never edit a migration that has already run.
