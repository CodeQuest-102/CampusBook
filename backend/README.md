# CampusBook — Backend

Spring Boot 3 (Java 21) REST API with PostgreSQL and JWT authentication.

## Run

Requires a running PostgreSQL with a `campusbook` database (see the root README
for the `CREATE DATABASE`/`CREATE USER` snippet), then:

```bash
./mvnw spring-boot:run          # http://localhost:8080
```

Flyway applies the schema on startup, then the seeder adds an institution, demo
rooms, demo users, and demo bookings.
Swagger UI: http://localhost:8080/swagger-ui.html

Password-reset email is off by default, so reset codes are **printed to the
console** — the flow is fully usable locally with no SMTP account.

## Test

```bash
./mvnw test                     # JUnit 5 + Mockito + MockMvc (PostgreSQL must be running)
```

`AuthorizationIntegrationTest` boots the real security chain with real JWTs to
prove the `@PreAuthorize` role gates hold over HTTP.

## Configuration

`src/main/resources/application.properties` reads env vars with dev fallbacks —
see `.env.example`. Override `JWT_SECRET` and DB credentials outside local dev.

Run production with `SPRING_PROFILES_ACTIVE=prod`: it disables SQL logging and
Swagger and, through `config/ProductionConfigGuard`, refuses to start if
`JWT_SECRET` is the bundled default or CORS is left as `*`.

## Database migrations

Schema lives in `src/main/resources/db/migration` and is owned by Flyway;
Hibernate runs in `validate` mode and never alters the schema. Add a new
`V<n>__description.sql` for each change — never edit one that has already run.

| Version | What |
|---------|------|
| `V1` | Baseline: institutions, users, halls, bookings, notifications |
| `V2` | Room codes unique per institution rather than globally |
| `V3` | `password_reset_tokens` (hashed one-time reset codes) |
| `V4` | `booking_audit` (append-only booking history) |

## Layout

```
src/main/java/com/campusbook/campusbook/
  controller/     REST endpoints (auth, halls, bookings, notifications, users,
                  reports, subscription)
  service/        Business logic (booking conflicts, limits, reports, subscription)
  repository/     Spring Data JPA repositories
  entity/         JPA entities (User, Hall, Booking, Institution, Notification,
                  PasswordResetToken, BookingAudit)
  dto/            Request/response records
  security/       JwtUtil, JwtAuthFilter, SecurityConfig, AttemptLimiter
  subscription/   SubscriptionCatalog + plan definitions (tier limits/features)
  exception/      GlobalExceptionHandler + typed exceptions
  config/         DataSeeder, OpenApiConfig, ProductionConfigGuard
src/main/resources/db/migration/   Flyway migrations (V1…V4)
```

## Notes

- All endpoints except `/api/auth/**` require `Authorization: Bearer <token>`.
  Missing/expired tokens get **401**; wrong role gets **403**.
- Every read and write is scoped to the acting user's institution — cross-campus
  access is a 403, not a filtered-empty result.
- Free-tier limits (5 rooms, 20 bookings/month) and analytics gating are driven
  by `subscription/SubscriptionCatalog`.
- Auth endpoints are rate limited in-memory by `security/AttemptLimiter`
  (single-instance; a multi-node deploy would need Redis or Bucket4j).
