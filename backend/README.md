# CampusBook — Backend

Spring Boot 3 (Java 21) REST API with PostgreSQL and JWT authentication.

## Run

Requires a running PostgreSQL with a `campusbook` database (see the root README
for the `CREATE DATABASE`/`CREATE USER` snippet), then:

```bash
./mvnw spring-boot:run          # http://localhost:8080
```

First run seeds an institution, demo rooms, demo users, and demo bookings.
Swagger UI: http://localhost:8080/swagger-ui.html

## Test

```bash
./mvnw test                     # JUnit 5 + Mockito (PostgreSQL must be running)
```

## Configuration

`src/main/resources/application.properties` reads env vars with dev fallbacks —
see `.env.example`. Override `JWT_SECRET` and DB credentials outside local dev.

## Layout

```
src/main/java/com/campusbook/campusbook/
  controller/     REST endpoints (auth, halls, bookings, notifications, users,
                  reports, subscription)
  service/        Business logic (booking conflicts, limits, reports, subscription)
  repository/     Spring Data JPA repositories
  entity/         JPA entities (User, Hall, Booking, Institution, Notification)
  dto/            Request/response records
  security/       JwtUtil, JwtAuthFilter, SecurityConfig
  subscription/   SubscriptionCatalog + plan definitions (tier limits/features)
  exception/      GlobalExceptionHandler + typed exceptions
  config/         DataSeeder, OpenApiConfig
```

## Notes

- All endpoints except `/api/auth/**` require `Authorization: Bearer <token>`.
- Free-tier limits (5 rooms, 20 bookings/month) and analytics gating are driven
  by `subscription/SubscriptionCatalog`.
