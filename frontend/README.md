# CampusBook — Frontend

Expo / React Native (TypeScript) app for the CampusBook lecture-hall booking
system. It talks to the Spring Boot backend over REST with JWT auth; the token is
stored with `expo-secure-store`. (Early builds were UI-only on placeholder data —
that has been replaced by live API calls; `src/data/placeholder.ts` now only
supplies shared TypeScript shapes.)

## Run

Start the backend first (see the root README), then:

```bash
npm install
npx expo start        # press i (iOS), a (Android), or w (web)
```

The iOS simulator reaches the backend at `localhost:8080` automatically. For a
physical device set `EXPO_PUBLIC_API_URL` to your machine's LAN IP — see
`.env.example`.

## Structure

```
src/
  config.ts                API base URL (env-overridable)
  theme.ts                 Design system: colors, spacing, radius, fonts, shadows
  api/                     fetch client, endpoint modules, adapters, types, tests
  validation.ts            Shared form rules (KNUST email, campus IDs, passwords)
  hooks/useApiData.ts      Focus-aware data loading + pull-to-refresh
  hooks/useApiList.ts      Same, for paginated endpoints (append pages, loadMore)
  data/placeholder.ts      Shared UI type definitions
  components/               Reusable UI (Button, RoomCard, StateView, Screen, …)
  navigation/              RootNavigator (auth gate + role tabs), AppContext (auth)
  screens/
    SplashScreen, OnboardingScreen, LoginScreen, SignUpScreen, misc/
    student/               Dashboard, BrowseRooms, RoomDetails, BookingForm,
                           BookingConfirmation, BookingDetails, MyBookings,
                           Calendar, DaySchedule, Notifications, Profile
    staff/                 StaffDashboard
    admin/                 AdminDashboard, PendingRequests, RequestDetails,
                           RoomManagement, Reports, Users, Subscription
```

## Auth & roles

Login takes an email (or staff/student ID) + password and calls the backend; the
role comes from the account, not a picker. The navigator swaps between the auth
stack and the app based on the stored token, and a 401 signs the user out.

Password reset is a two-step flow: request a code, then enter the code with a new
password. In development the backend prints the code to its console, so the flow
works without an SMTP account.

## Notable flows

- **Browse Rooms** — search debounces into the API; the filter sheet (capacity,
  equipment, availability window) filters server-side, not over a loaded list.
- **Pending Requests** (admin) — long-press to enter selection mode, then bulk
  approve/reject. The summary names any request that failed and why.
- **Booking / Request details** — an audit timeline of who did what, and an
  "Add to Calendar" export that writes an `.ics` and opens the share sheet.
- **Notifications** — paginated infinite scroll via `useApiList`.

## Testing

```bash
npm test              # Jest — validation, adapters, screens
npx tsc --noEmit      # type-check
```

See [TESTING.md](TESTING.md) for the manual walkthrough.

## Design system

Colors, spacing, radius, and type come from `theme.ts`:

- Primary / action blue `#0340CF` · Deep brand blue `#0034AC`
- Status: green = available/approved · amber = pending · red = rejected/cancelled · orange = maintenance
