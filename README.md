# CampusBook

A lecture-hall booking system for KNUST. Students leaders and lecturers browse
rooms and request bookings; administrators approve/reject requests, manage rooms
and users, and view analytics. Billing follows a freemium, institution-level
subscription model (individual users are never charged).

- **Backend** — Spring Boot 3 (Java 21) + PostgreSQL, JWT auth
- **Frontend** — React Native / Expo (SDK 51), React Navigation, TypeScript

## Features

- **Auth** — register / login (email or staff-student ID), JWT, self-service
  password reset, profile editing
- **Rooms (halls)** — browse, details, admin CRUD, time-based availability
- **Bookings** — create with purpose / attendance / notes, conflict detection,
  reschedule (re-approval), cancel; admin approve / reject
- **Notifications** — in-app, per user, with unread counts
- **Analytics** — most-booked room, peak day, utilization, bookings-over-time
  (Campus Pro)
- **Subscription** — Free / Campus Pro / Enterprise tiers with enforced limits
  and a simulated in-app upgrade (admin, institution-scoped)

## Roles & tiers

| Role | Backend enum | Can |
|------|--------------|-----|
| Student leader | `STUDENT_LEADER` | browse, book, manage own bookings |
| Lecturer | `LECTURER` | same as student leader |
| Admin | `ADMIN` | approve/reject, manage rooms & users, analytics, subscription |

| Tier | Price | Limits / features |
|------|-------|-------------------|
| Free | GHS 0/mo | 5 rooms, 20 bookings/month, basic workflow |
| Campus Pro | GHS 500/mo | unlimited rooms & bookings, analytics dashboard |
| Enterprise | Custom | multi-campus, API integrations, SLA (contact sales) |

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

On first run it seeds an institution, demo rooms, demo users, and demo bookings.
API docs (Swagger UI): http://localhost:8080/swagger-ui.html

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

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@campusbook.local` | `admin12345` |
| Lecturer | `lecturer@campusbook.local` | `lecturer12345` |
| Student | `student@campusbook.local` | `student12345` |

## Configuration (env vars)

Both apps run with sensible dev defaults and need no env vars locally. For shared
or production environments, set them — see `backend/.env.example` and
`frontend/.env.example`. **Always override `JWT_SECRET` and the DB credentials
outside local development.**

Backend: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION_MS`,
`CORS_ALLOWED_ORIGINS`, `SERVER_PORT`.
Frontend: `EXPO_PUBLIC_API_URL`.

## Testing

```bash
cd backend  && ./mvnw test          # JUnit + Mockito (needs PostgreSQL running)
cd frontend && npm test             # Jest (adapters)
cd frontend && npx tsc --noEmit     # type-check
```

## API overview

All endpoints except `/api/auth/**` require `Authorization: Bearer <token>`.

- `POST /api/auth/{register,login,reset-password}`
- `GET/POST/PUT/DELETE /api/halls…`, `GET /api/halls/{id}/availability`
- `POST /api/bookings`, `GET /api/bookings/my`, `/pending`, `/{id}/{approve,reject,cancel,reschedule}`
- `GET /api/notifications`, `/unread-count`, `PATCH /{id}/read`, `/read-all`
- `GET/PATCH /api/users/me`, `GET /api/users` (admin)
- `GET /api/reports/overview`, `/summary` (Campus Pro)
- `GET /api/subscription`, `/plans`, `POST /api/subscription/upgrade` (admin)
