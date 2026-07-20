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
  hooks/useApiData.ts      Focus-aware data loading + pull-to-refresh
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

## Testing

```bash
npm test              # Jest — adapter unit tests
npx tsc --noEmit      # type-check
```

## Design system

Colors, spacing, radius, and type come from `theme.ts`:

- Primary / action blue `#0340CF` · Deep brand blue `#0034AC`
- Status: green = available/approved · amber = pending · red = rejected/cancelled · orange = maintenance
