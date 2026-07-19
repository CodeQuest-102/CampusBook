# CampusBook — Testing Guide

This app is UI-only (no backend). All data is static, from
[`src/data/placeholder.ts`](src/data/placeholder.ts). The goal of testing is to
confirm every screen renders and every navigation path works — not to check
saved data (nothing persists).

---

## 1. How to run it

Install once:

```bash
npm install
```

Then pick a target:

| Target | Command | Notes |
| --- | --- | --- |
| **iOS Simulator** (recommended) | `npm run ios` | Needs Xcode. Best fidelity to the mockups. |
| **Android Emulator** | `npm run android` | Needs Android Studio + a running emulator. |
| **Real phone** | `npm start`, then scan the QR code in **Expo Go** | Install “Expo Go” from the App/Play Store first. |
| **Web** | `npm run web` | Convenient, but see the Known Issues note below. |

> **Known issue (web):** the browser build is currently showing a blank screen
> while it's being root-caused. **Test on a device or simulator** (Expo Go / iOS
> / Android) for now — that's the real target for a React Native app. If you only
> have web available, tell me and I'll prioritise the web fix.

---

## 2. Switching roles

There's no real login, so the **Login screen has a Student / Staff / Admin
selector** at the top. Pick a role, tap **Login**, and you land in that role's
app. To change roles later: **Profile tab → Logout → pick another role**.

---

## 3. What to walk through

Go role by role. For each screen, check: **(a)** it renders without a crash,
**(b)** it roughly matches the mockup, **(c)** every button/tab goes somewhere
sensible.

### Onboarding + auth (all roles)
- [ ] Splash shows, then auto-advances
- [ ] Onboarding: swipe through all 3 slides; dots track; **Skip** and **Next/Get Started** work
- [ ] Sign Up: fields accept input; the Terms checkbox enables the button
- [ ] Login: role selector highlights; **Login** enters the app

### Student
- [ ] Dashboard: greeting, search, promo card, Quick Stats (2 / 1 / 3), Quick Actions
- [ ] Browse Rooms → filter chips → tap a room
- [ ] Room Details → **Book Now** (should be disabled for the "maintenance" room, K3.04)
- [ ] Booking Form → **Submit Request**
- [ ] Confirmation screen → **View My Bookings** / **Back to Home**
- [ ] Bookings tab: status filter chips; tap a booking → Booking Details
- [ ] Calendar: tap dates (16 & 20 May have dots); day events show; **+** button
- [ ] Day Schedule (from a calendar event): time rail with blocks
- [ ] Notifications: colored icons per type; unread dots
- [ ] Profile: menu rows; **Logout** returns to Login

### Staff
- [ ] Dashboard: Overview stats (5 / 2 / 8), Recent Bookings, Quick Actions
- [ ] Same Browse → Details → Book flow as student

### Admin
- [ ] Dashboard: blue System Overview (45 / 128 / 12), Quick Actions
- [ ] Requests tab: All / Staff / Students filters; tap **View** on a request
- [ ] Request Details: requester info; **Reject** (red) / **Approve** (green)
- [ ] Room Management (from dashboard): room list, **Add Room**, edit/delete icons
- [ ] Reports tab: Most Booked / Peak Day cards, Utilization bar (72%), bar chart

### Design system spot-checks
- [ ] Buttons/active states use action blue `#0340CF`
- [ ] Splash background is deep blue `#0034AC`
- [ ] Status pills: green = available/approved, amber = pending, red = rejected, orange = maintenance
- [ ] Cards are light-grey, rounded, with a subtle shadow

---

## 4. How to report an issue back to me

Paste a message in this format — one block per issue. The more of it you fill
in, the faster I can fix it:

```
Screen:    <e.g. Admin → Request Details>
Role:      <Student | Staff | Admin>
Steps:     <what you tapped, in order>
Expected:  <what you thought would happen / how the mockup looks>
Actual:    <what actually happened>
```

**Really helpful to include:**
- A **screenshot** of the screen (drag it into the chat).
- If something **crashed or went blank**, the error text:
  - **Device/simulator:** the red error box, or the terminal output where
    `npm start` is running — copy the lines after `ERROR` / `Uncaught`.
  - **Web:** open the browser DevTools **Console** tab (⌥⌘J on Chrome/Mac) and
    copy any red errors.

**Quick shorthand is fine too**, e.g.:
> "Calendar tab, admin role — the + button overlaps the bottom nav."
> "Room card status pill for K3.04 is amber but should be orange."

If it's a look-and-feel tweak (spacing, color, wording, icon), just describe it
in plain language and point at the screen — no template needed.

---

## 5. Fast triage checklist (if the whole app is blank/broken)

1. `npm install` completed without errors?
2. Are you on web? → try a device/simulator instead (see Known Issues).
3. In the `npm start` terminal, is the bundle building? Look for
   `Bundled … index.ts (N modules)` vs. a red `ERROR`.
4. Send me the terminal output + which target (iOS/Android/web) you used.
