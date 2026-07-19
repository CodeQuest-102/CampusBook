# CampusBook

Smart Lecture Room Booking System — a UI-only Expo / React Native (TypeScript) app
scaffolded from the design mockups. No backend: every screen is driven by local
placeholder data in [`src/data/placeholder.ts`](src/data/placeholder.ts).

## Run

```bash
npm install
npm start        # then press i (iOS), a (Android), or w (web)
```

## Structure

```
src/
  theme.ts                 Design system: colors, spacing, radius, fonts, shadows
  data/placeholder.ts      Static demo data (rooms, bookings, requests, etc.)
  components/               Reusable UI: Button, TextField, RoomCard, BookingCard,
                           StatusPill, TopBar, BottomNav, Card, Avatar, Screen, ui.tsx
  navigation/              RootNavigator (stack) + role-based bottom tabs, AppContext
  screens/
    SplashScreen, OnboardingScreen, LoginScreen, SignUpScreen
    student/               Dashboard, BrowseRooms, RoomDetails, BookingForm,
                           BookingConfirmation, BookingDetails, MyBookings,
                           Calendar, DaySchedule, Notifications, Profile
    staff/                 StaffDashboard
    admin/                 AdminDashboard, PendingRequests, RequestDetails,
                           RoomManagement, Reports
```

## Roles

The **Login** screen has a Student / Staff / Admin selector (a demo affordance) so
each role's dashboard and tab set is reachable without a real backend. Tapping
**Login** enters the app; **Logout** (Profile) returns to the auth flow.

## Design system

All colors, spacing, radius, and type come from `theme.ts`:

- Primary / action blue `#0340CF` · Deep brand blue `#0034AC`
- Status: green = available/approved · amber = pending · red = rejected/cancelled · orange = maintenance
