# MindSwap @ FESKUM 2026 — Event Operations Guide

Physical and on-the-ground checklist for running the digital passport, booth
voting, and UM Talk People’s Choice during the event.

This is the companion to the web app. The app handles scanning, stamping,
rating, voting, and live tallies. This document covers the **physical** things
that make it work on the day.

**Related:** `DDAY-PRINT.md` (what to print, sizes, copy, budget) ·
`PROJECT-MEMO.md` (status, risks, backlog) · `BUDGET.md` (hosting costs) ·
`../README.md` (setup).

---

## 1. Quick facts

| Item | Value |
| --- | --- |
| Public URL | `https://feskum-mindswap.vercel.app` *(replace with final domain)* |
| Event | MindSwap @ FESKUM 2026 · 13–14 Nov 2026 |
| Venue | Marquee Tent, High Impact Research Building, Universiti Malaya |
| Expected load | 300–400 attendees per session |
| Login | **None for students** — full name + unique @username + faculty on first open |
| Admin | Hidden entrance, passcode-protected |
| Reward threshold | 8 required stamps (configurable in Admin → Helpdesk) |

> **Critical:** the public URL is baked into every printed QR code. **Buy and
> connect the final domain BEFORE printing any QR signage.** If the domain
> changes later, every printed QR breaks and must be reprinted.

---

## 2. Admin access (hidden)

There is no visible admin button for students.

**To open the organiser portal:**

1. Tap the **“MindSwap” logo 5 times quickly** (within 2 seconds).
   - On the first-open screen (before signup) tap the small **“// Laluan
     Aspirasi”** label 5 times instead.
2. You land on `/admin`.
3. Enter the passcode (default: `admin2026`).

**Fallback:** go directly to `<public-url>/admin` in the browser. The route is
not linked anywhere, so it stays hidden from attendees.

**Before the event:**

- [ ] Change `NEXT_PUBLIC_ADMIN_PASSCODE` in the deployment environment.
- [ ] Change `NEXT_PUBLIC_SCAN_BYPASS_CODE` (defaults to the same value).
- [ ] Confirm the new passcode works on a phone.
- [ ] Share the passcode with **only** the helpdesk lead and event director.

Admin sections:

| Tab | Use |
| --- | --- |
| Overview | KPIs, DB write health, Best Booth standings, People’s Choice live tally |
| Booths | Add/edit booths, upload photos, show/download QR per booth |
| Speakers | Manage the 16 UM Talk speakers |
| Helpdesk | Verify by @username or Visitor ID and mark a prize **claimed** |
| Export | Download booth-visit and speaker-vote CSV files |

---

## 3. QR codes — generate, print, place

### 3.1 What to print

1. **Booth QR signs** (one per booth) — the main interaction.
   - Admin → Booths → **QR sheet** → Print.
   - Each card shows booth name, faculty, QR, token, and location.
   - Print A4, cut into cards, **matte laminate** (not gloss — glare breaks
     scans), and mount at eye level (~1.4 m).
2. **Entrance poster** (1–2) — a single large QR that opens the app, plus the
   steps “Scan booth QR → Rate → Collect stamps → Redeem prize”.
3. **Stage / UM Talk poster** — QR to open the app, plus “Vote for People’s
   Choice in the app”.
4. **Helpdesk card** — printed with the admin URL, passcode, and redemption
   steps (do **not** post this publicly).

### 3.2 Placement

- [ ] One QR per booth, mounted so a standing attendee can scan without crouching.
- [ ] Add a fallback line of text under the QR: **“No camera? Ask staff for the
      override code.”**
- [ ] Keep QR signs out of direct sunlight/glare and away from reflective
      surfaces — phone cameras struggle with both.
- [ ] Do not place two booth QRs so close that the wrong one scans.
- [ ] Entrance poster visible before people reach the booths.

### 3.3 Test before printing 100 copies

- [ ] Print **one** booth card first and scan it on iPhone + Android.
- [ ] Confirm the URL opens the correct booth page.
- [ ] Confirm the booth page shows the rating form (not “Invalid checkpoint”).
- [ ] Submit a test rating and confirm the stamp appears in Passport.
- [ ] Delete/reset the test visit if needed (Admin → Booths / database).

### 3.4 Test QR codes (for the secretariat)

The secretariat asked for QR codes to test with. Provide:

- [ ] The printed booth sheet from Admin → Booths → QR sheet.
- [ ] A one-page “Test QR” sheet with 2–3 sample booth tokens
      (e.g. `qr-eng-robotics`).
- [ ] The **manual override** instructions (Section 3.5).

> Do not publish a public “test QR” page in the app — it would let attendees
> collect stamps without visiting booths.

### 3.5 Camera failed? Manual override

On the Scan page, staff can enter a booth token manually:

1. Scroll to **“Staff override — manual booth token”**.
2. Enter the booth token (e.g. `qr-eng-robotics`).
3. Enter the override code.
4. Tap **Go**.

Keep the booth-token list at the helpdesk (Section 8).

---

## 4. Connectivity & load (300–400 concurrent)

- [ ] **Test on-site, not from the office.** Walk the venue with a phone.
- [ ] Test on **campus Wi-Fi** and on **mobile data** (CelcomDigi/Maxis/U Mobile).
- [ ] If campus Wi-Fi is weak, prepare a **4G/5G hotspot** at the helpdesk.
- [ ] Confirm the app loads in under ~3 seconds on a mid-range phone.
- [ ] Confirm QR scanning works under venue lighting.
- [ ] Have a **backup phone** (charged) logged into the admin portal.
- [ ] Power bank + charging cable at the helpdesk.

The app is a static Next.js site reading/writing to Supabase. No custom server
to crash; the only external dependency is Supabase and the venue connection.

---

## 5. Device testing matrix

The two reported bugs were iOS-specific. Test on real devices:

- [ ] iPhone (Safari) — faculty picker, modals, scanning
- [ ] iPad (Safari) — faculty picker, layout
- [ ] Android (Chrome) — scanning, rating
- [ ] Small phone (≤ 375 px wide) — modals scroll, no clipping

Checks per device:

- [ ] First-open form: name, matric (optional), **faculty dropdown opens**
- [ ] Booth list: tapping a card opens details (scrolls, closes)
- [ ] Map view: tapping a booth opens details
- [ ] Scan: camera permission prompt appears
- [ ] Rating: 5 stars selectable, review optional, submit works
- [ ] Passport: stamp appears, progress updates
- [ ] Talks: speaker cards show, voting works once
- [ ] Admin: hidden logo tap opens login, passcode works

---

## 6. Floor plan (prepared, awaiting venue plan)

The app supports a real floor plan and a generated schematic.

- The **Map** toggle lives inside **Booths** (Exhibition).
- Today it renders a **schematic** built from each booth’s `location`
  (e.g. “Booth A-01” → aisle A, position 1).
- “You were here” highlights the **last booth the attendee scanned** — no GPS
  permission needed.

**To add the real venue plan later:**

1. Save the floor-plan image to `public/` (e.g. `public/floorplan.png`).
2. Edit `src/lib/floorplan.ts`:
   - set `image: '/floorplan.png'`
   - add precise coordinates per booth under `nodes`, keyed by `qr_token`,
     e.g. `'qr-eng-robotics': { x: 22, y: 38 }` (percent of the image).
3. Deploy. No other changes needed.

- [ ] Obtain the Marquee Tent, High Impact Research Building floor plan (PDF/image) from the venue.
- [ ] Confirm the booth numbering/placement with the exhibition lead.
- [ ] Provide the plan + coordinates to the developer.

---

## 7. People’s Choice voting

- Students vote **in the app** (one vote per device/browser identity).
- Duplicate protection is enforced by a database constraint
  (`unique(visitor_id, voting_event_id)`).
- Live tally: **Admin → Overview → People’s Choice** (auto-refreshes every 30s).
- Export: **Admin → Export → UM Talk Speaker Votes CSV**.

**Before announcing:**

- [ ] Confirm voting is open (Admin → Speakers / voting event active).
- [ ] Check the tally on the admin overview.
- [ ] Export the CSV and save a copy.
- [ ] Announce from the app tally, not from memory.

> If you prefer a Google Form, run it as a **secondary** channel only. The app
> already prevents duplicate votes without requiring a Google login.

---

## 7b. Partner booths & quizzes

- Partner booths are optional bonus stops. A partner stamp is worth **+5 points**
  and does **not** count toward the 8 required stamps or Best Booth.
- Visiting every active partner booth awards a one-time **+10 partner trail** bonus.
- Each partner booth may have up to **2 quiz questions**; correct answers are
  **+5 points each**. Visitors get one attempt per booth, and the quiz never
  blocks the stamp.
- Create partner booths in **Admin → Booths**; set type **Partner** and add quiz
  options. Freeze the partner list before doors open so the trail is stable.
- Prize eligibility is always based on the **8 required stamps**, not points.

---

## 8. Helpdesk redemption runbook

1. Attendee opens **Passport** → **Show badge** (appears after 8 required stamps).
2. Staff asks for the **@username** or reads the **Visitor ID** on the badge.
3. Admin → **Helpdesk** → paste @username or Visitor ID → **Verify**.
4. Confirm full name + @username, status **READY**, and required-stamp count ≥ threshold.
5. Enter staff name/ID → **Mark prize claimed**.
6. Hand over the souvenir.

- [ ] Print the booth-token list (fallback for camera failures).
- [ ] Print 2 copies of this runbook (helpdesk + director).
- [ ] Brief every helpdesk volunteer on the flow.
- [ ] Keep a **paper tally** (name/ID/time) as a backup if the network drops.

---

## 9. Day-of checklist

### Morning (before doors)

- [ ] Final domain resolves; app opens from a fresh phone.
- [ ] Admin login works; write-health check is green.
- [ ] All booth QRs printed, laminated, and mounted.
- [ ] Entrance + stage posters up.
- [ ] Reward threshold correct (Admin → Helpdesk).
- [ ] Speakers/sessions visible in UM Talk.
- [ ] Voting open.
- [ ] Helpdesk devices charged; hotspot ready.
- [ ] Paper backup forms printed.

### During the event

- [ ] Watch Admin → Overview (DB write health, KPIs).
- [ ] Re-check the People’s Choice tally before each announcement.
- [ ] Keep an eye on the helpdesk queue; use manual override if cameras fail.
- [ ] Replace any damaged QR sign immediately.

### Closing

- [ ] Close voting.
- [ ] Export **Booth Visits & Quiz CSV**, **Visitor Identities CSV**, and **Speaker Votes CSV**.
- [ ] Screenshot the final standings.
- [ ] Save exports to two locations (laptop + cloud drive).
- [ ] Note any incidents in a short handover log.

---

## 10. Emergency fallbacks

| Problem | Fallback |
| --- | --- |
| Camera won’t scan | Manual token + override code (Scan page) |
| Booth QR damaged | Reprint from Admin → Booths; or manual token |
| Wi-Fi down | Mobile data / hotspot; paper tally at helpdesk |
| App won’t load | Check Supabase status; use paper tally; retry |
| Duplicate vote complaint | One vote per device is enforced; verify in admin |
| Prize badge won’t open | Staff verifies by @username or Visitor ID directly in Helpdesk |

---

## 11. Privacy & data

- Students enter **full name + unique @username + optional matric + faculty**; no password/email.
- Identity is stored on the device (`localStorage`).
- Full names stay private; the public leaderboard shows **@username** and can be
  opted out from the profile.
- Partner booths award bonus points but do not count toward the 8 required stamps.
- Export CSVs contain full names, usernames, Visitor IDs, quiz results, and reviews — treat as internal event data.
- Delete test visits and test votes before the event opens.

---

## 12. Contacts (fill in)

| Role | Name | Phone |
| --- | --- | --- |
| Event director | | |
| Helpdesk lead | | |
| Technical lead | | |
| Venue/AV | | |
| Supabase/Vercel owner | | |
