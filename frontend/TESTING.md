# CampusBook — Testing Guide

The app talks to the real Spring Boot API — there's no static data or fake role
selector anymore. To test it you need **the backend running** and then the Expo
app pointed at it. Data persists in PostgreSQL, so what you create sticks around.

---

## 1. Start the backend first

From the repo root:

```bash
cd backend
./mvnw spring-boot:run
```

It comes up on `http://localhost:8080` and, on first run, seeds an institution,
demo rooms, demo users, and demo bookings. Swagger UI is at
`http://localhost:8080/swagger-ui.html` if you want to poke the API directly.

You need PostgreSQL running with a `campusbook` database — see the root
[README](../README.md#1-database) for the one-time setup.

---

## 2. Then run the app

Install once:

```bash
npm install
```

Then pick a target:

| Target | Command | Notes |
| --- | --- | --- |
| **iOS Simulator** (recommended) | `npm run ios` | Needs Xcode. Reaches the backend at `localhost:8080` automatically. |
| **Android Emulator** | `npm run android` | Needs Android Studio + a running emulator. |
| **Real phone** | `npm start`, then scan the QR in **Expo Go** | Set `EXPO_PUBLIC_API_URL` to your machine's LAN IP first — see [`.env.example`](.env.example). `localhost` on the phone means the phone, not your Mac. |

> **Physical device gotcha:** the phone and your computer must be on the same
> Wi-Fi, and the backend has to be reachable at your machine's LAN IP (e.g.
> `http://192.168.1.20:8080`). If login spins forever with a "Network error", the
> app can't see the backend — check the IP and that the backend is actually up.

---

## 3. Logging in

Log in with a **seeded account** (from the root README). Either the email or the
staff/student ID works as the handle:

| Role | Email | Staff / Student ID | Password |
| --- | --- | --- | --- |
| Admin | `admin@campusbook.local` | `ADMIN001` | `admin12345` |
| Lecturer | `lecturer@campusbook.local` | `200912345` | `lecturer12345` |
| Student | `student@campusbook.local` | `20551234` | `student12345` |

To switch roles, **Profile tab → Logout**, then log in as another account. You
can also **Sign Up** a fresh Student Leader or Lecturer — KNUST email required
(`…@knust.edu.gh`), student IDs are 8 digits and staff IDs are 9. Admin accounts
can't be self-registered; the server rejects it.

---

## 4. What to walk through

Go role by role. For each screen check: **(a)** it renders without a crash,
**(b)** the data matches what's actually in the backend, **(c)** actions round-trip
(create something, pull-to-refresh, confirm it's still there).

### Auth
- [ ] Splash → Onboarding (swipe 3 slides, Skip/Next work) → Login
- [ ] Login with a wrong password shows an error, not a crash
- [ ] Sign Up: non-KNUST email is rejected; wrong-length ID is rejected; a valid
      sign-up lands you in the app
- [ ] Forgot Password: request a code, read it from the **backend console log**
      (mail is off by default), set a new password, log in with it

### Student / Lecturer
- [ ] Dashboard: greeting, quick stats, unread notification count
- [ ] Browse Rooms: search filters the list; filter sheet (capacity + equipment
      + time window) narrows results server-side
- [ ] Room Details → Book Now → Booking Form → Submit → the booking appears under
      **My Bookings** as *Pending*
- [ ] My Bookings: status filter; open a booking → Details → the history timeline
      shows "created"; cancel/reschedule work
- [ ] Calendar / Day Schedule: approved bookings show on the right dates
- [ ] Notifications: unread dots; mark-all-read clears the badge
- [ ] Export a booking as `.ics` and open it in your calendar app

### Admin
- [ ] Dashboard: system overview stats
- [ ] Pending Requests: All / Staff / Students filters; **select mode** →
      bulk-approve several at once; if two conflict on the same slot, the result
      names the one that failed
- [ ] Request Details: Approve / Reject (with reason); the requester gets a
      notification and the booking's history updates
- [ ] Room Management: add / edit / disable a room
- [ ] Reports (Campus Pro): most-booked, peak day, utilization, bookings-over-time;
      CSV export downloads

---

## 5. Reporting an issue back

Paste one block per issue:

```
Screen:    <e.g. Admin → Pending Requests>
Role:      <Student | Lecturer | Admin>
Steps:     <what you tapped, in order>
Expected:  <what you thought would happen>
Actual:    <what actually happened>
```

**Really helpful to include:**
- A **screenshot** (drag it into the chat).
- If it **crashed or went blank**, the red error box on the device, or the lines
  after `ERROR` in the `npm start` terminal.
- If it's an **API problem** (data wrong, a request failed), also grab the
  **backend** terminal output around the same moment — the stack trace there is
  usually the real story.

---

## 6. Fast triage (whole app blank / stuck on login)

1. Is the **backend** actually running on `:8080`? (`curl localhost:8080/api/halls`
   should return `401`, not "connection refused".)
2. `npm install` completed without errors?
3. On a **physical device**? → `EXPO_PUBLIC_API_URL` set to your LAN IP, same Wi-Fi?
4. In the `npm start` terminal, is the bundle building (`Bundled … index.ts`) or
   is there a red `ERROR`?
5. Send both terminals' output (Expo + backend) and which target you used.
