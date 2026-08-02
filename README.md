# CampusBook

A lecture-hall booking system for KNUST. Students leaders and lecturers browse
rooms and request bookings; administrators approve/reject requests, manage rooms
and users, and view analytics. Billing follows a freemium, institution-level
subscription model (individual users are never charged).

- **Backend** — Spring Boot 3 (Java 21) + PostgreSQL, JWT auth
- **Frontend** — React Native / Expo (SDK 51), React Navigation, TypeScript

## Features

- **Auth** — register / login (email or staff-student ID), JWT, email
  verification by one-time code (a self-registered account can't log in until
  it's verified), password reset by emailed one-time code, profile editing,
  rate-limited auth endpoints
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
  and an in-app upgrade (admin, institution-scoped). The paid Campus Pro upgrade
  runs through **Paystack** when configured — the backend initializes and
  **verifies** the transaction with its secret key (the app never holds a key) —
  and falls back to a simulated payment when Paystack is off. Downgrades (including
  the "Switch to Free" reset) never touch payment

All data is **scoped to the acting user's institution** — an admin at one campus
can neither see nor act on another campus's rooms, requests or reports.

## Roles & tiers

| Role | Backend enum | Can |
|------|--------------|-----|
| Student leader | `STUDENT_LEADER` | browse, book, manage own bookings |
| Lecturer | `LECTURER` | same as student leader |
| Admin | `ADMIN` | approve/reject, manage rooms & users, analytics, subscription |
| Platform admin | `PLATFORM_ADMIN` | onboard new institutions, view a read-only cross-institution summary — no access to any one school's rooms, bookings or users |

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
> That keeps the whole reset flow demoable without a Brevo account.

> **Email verification in development:** same deal — the code that's emailed on
> self-registration is also **printed to the backend console** in a banner. A
> self-registered account can't log in until that code is confirmed via
> `POST /api/auth/verify-email`.

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

| Institution | Role | Email | Staff / Student ID | Password |
|-------------|------|-------|--------------------|----------|
| KNUST | Admin | `admin@knust.edu.gh` | `ADMIN001` | `admin12345` |
| KNUST | Lecturer | `lecturer@knust.edu.gh` | `200912345` | `lecturer12345` |
| KNUST | Student | `student@knust.edu.gh` | `20551234` | `student12345` |
| Ridgeview University | Admin | `admin@ridgeview.edu` | `RIDGEVIEW-ADMIN001` | `ridgeview12345` |
| Legon | Admin | `admin@ug.edu.gh` | `LEGON-ADMIN001` | `legon12345` |
| CampusBook Internal | Platform admin | `platform@campusbook.local` | `PLATFORM001` | `platform12345` |

Either the email or the ID works as the login handle. Campus IDs have no fixed
format — each institution issues its own. Admin and platform-admin accounts are
provisioned rather than self-registered, so sign-up's ID/email rules don't apply
to them.

Ridgeview University and Legon exist to prove the app actually works across more
than one institution — self-registration resolves an institution from the
registering email's domain, and each admin above is scoped to their own
institution's data only (see "All data is scoped to the acting user's
institution" under Features).

The platform admin belongs to a seeded, internal-only "CampusBook Internal"
institution that never appears in its own institution list — it's a sentinel to
satisfy the `institution_id` foreign key, not a real customer. Platform-admin
accounts are seed-only for now; there's no self-service way to create another one.

## Configuration (env vars)

Both apps run with sensible dev defaults and need no env vars locally. For shared
or production environments, set them — see `backend/.env.example` and
`frontend/.env.example`. **Always override `JWT_SECRET` and the DB credentials
outside local development.**

Backend: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`,
`CORS_ALLOWED_ORIGINS`, `SERVER_PORT`, for email
`MAIL_ENABLED`, `MAIL_FROM`, `BREVO_API_KEY`, `BREVO_BASE_URL`,
and for payments `PAYSTACK_ENABLED`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_BASE_URL`,
`PAYSTACK_CALLBACK_URL`.
Frontend: `EXPO_PUBLIC_API_URL`.

> **Payments in development:** Paystack is off by default (`PAYSTACK_ENABLED=false`),
> so the upgrade uses a simulated payment and needs no keys. Set `PAYSTACK_ENABLED=true`
> and `PAYSTACK_SECRET_KEY` to a Paystack **test** secret key (`sk_test_…`, GHS enabled)
> to take real test payments — pay with test card `4084 0840 8408 4081`, CVV `408`,
> any future expiry, PIN `0000`, OTP `123456`. The secret key stays server-side.

### Production profile

Run with `SPRING_PROFILES_ACTIVE=prod` in any real deployment. It turns off SQL
logging and Swagger, stops Flyway from baselining an unknown schema, and — via
`ProductionConfigGuard` — **refuses to start** if `JWT_SECRET` is still the bundled
development default or `CORS_ALLOWED_ORIGINS` is `*`. A crash at boot is
deliberate: it's better than quietly running an insecure instance.

### Deploying to Render

The backend ships with a `backend/Dockerfile` (Render has no native Java
runtime, so it deploys as a Docker web service):

1. Create a **Postgres** instance on Render; from its Connections page, compose
   `DB_URL=jdbc:postgresql://<host>:<port>/<database>` (Render's own combined
   connection string is `postgres://…`, which the JDBC driver can't parse
   directly) and set `DB_USERNAME`/`DB_PASSWORD` from the same page.
2. Create a **Web Service** from this repo — Docker runtime, Dockerfile path
   `backend/Dockerfile`, Docker context `backend/`.
3. Set env vars: `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` (above), a fresh
   `JWT_SECRET` (never the bundled default), `CORS_ALLOWED_ORIGINS` (a real
   origin, not `*`), `SPRING_PROFILES_ACTIVE=prod`, and the `MAIL_*`/`BREVO_*`
   vars for Brevo (see below). Render injects `PORT` itself — `server.port`
   already honors it, no `SERVER_PORT` needed.
4. Deploy and check the logs: Flyway migrating cleanly, the seeder adding demo
   data, no `ProductionConfigGuard` startup failure.

Then point the Expo app at it via `frontend/.env`'s `EXPO_PUBLIC_API_URL`.

Outbound mail (password reset, email verification) goes through **Brevo**'s
transactional email **HTTP API**, not SMTP — cloud hosts including Render
commonly block outbound SMTP ports (25/587/2525) to curb spam abuse, which
makes SMTP a dead end for a hosted instance. Set `BREVO_API_KEY` from Brevo's
SMTP & API settings → "API keys & MCP" tab (a separate key from the SMTP one);
the `MAIL_FROM` address must be verified in Brevo's dashboard first (Senders,
Domains & Dedicated IPs → Senders).

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
required role returns **403**. `/api/auth/login` also uses 403 for an unrelated
reason — see below — so a 403 there isn't a role gate.

**Auth**
- `POST /api/auth/register` — `201`, no token in the response: the account
  can't log in until its email is verified (see `/verify-email` below)
- `POST /api/auth/login` — `200` with a token, or **403** if the account's
  email isn't verified yet (distinct from a **401** wrong-password/credentials
  failure, so the frontend can route the user to verification instead of
  showing a generic sign-in error)
- `POST /api/auth/verify-email` — `{ emailOrId, otp }` → `200` with a token,
  finishing the sign-in `/register` didn't
- `POST /api/auth/resend-verification` — `{ emailOrId }` → always 204, same
  account-enumeration protection as `/forgot-password`
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
- `GET /api/subscription`, `/plans` (admin); `POST /api/subscription/upgrade`
  (admin) — direct tier switch, used for downgrades and the simulated upgrade
- `POST /api/subscription/checkout` — starts a Paystack payment for a paid
  upgrade; `POST /api/subscription/verify` — verifies the reference server-side,
  then applies the upgrade (admin)

## Database migrations

The schema is owned by Flyway (`backend/src/main/resources/db/migration`), not by
Hibernate — `ddl-auto` is `validate`, so entity/schema drift fails at startup
rather than being silently applied. Add changes as a new `V<n>__description.sql`;
never edit a migration that has already run.
