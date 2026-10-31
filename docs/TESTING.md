# Testing Guide — Admin → Visitor

End-to-end test plan for **MindSwap @ FESKUM 2026**. Run this against the deployed site before printing QR codes or opening the event.

- **Production URL:** https://feskum-mindswap.vercel.app
- **Admin passcode:** configured in the server-only `ADMIN_PASSCODE` secret
- **Staff scan override code:** configured in the server-only `STAFF_SCAN_CODE` secret
- **Live booths:** 8 active required booths (test booth removed)
- **Reward threshold:** 8 required stamps
- **Ranking metric:** points (required ×10, partner ×5, trail +10, quiz +5/correct, votes ×25)
- **Identity:** full name + unique @username + faculty required; matric optional

> **Use test identities.** Every test visitor name must start with `TEST` and every matric with `TEST-`, e.g. `TEST Visitor A` / `TEST-2026-001`. This makes cleanup safe and unambiguous.

---

## 0. Test kit

| Item | Setup |
| --- | --- |
| Browser A | Desktop Chrome, clean profile (visitor) |
| Browser B | Phone Safari/Chrome or second incognito (visitor) |
| Browser C | Desktop Chrome incognito (admin only) |
| Network | Production HTTPS (camera + QR need it) |
| Tools | Supabase SQL editor, phone camera, printed QR sample (optional) |

**Reset a visitor browser:** DevTools → Application → Storage → **Clear site data** (cookies + local storage), then reload. Clearing local storage alone does not reset the signed HttpOnly visitor cookie.

**Live booth tokens** (for staff override testing):

| Booth | Token |
| --- | --- |
| Robotics & AI Innovation Showcase | `qr-eng-robotics` |
| Quantum Computing & Cyber Defense | `qr-fsktm-quantum` |
| Bio-Tech & Tropical Biodiversity Lab | `qr-science-biotech` |
| Zero-Carbon Urban Farming | `qr-fab-greenfarm` |
| Inclusive EdTech & Sign AI Translator | `qr-edu-signai` |
| FinTech AI Fraud Detection Sandbox | `qr-fbe-fintech` |
| Smart Legal Contract AI Assistant | `qr-law-smartcontract` |
| UM Makerspace Hardware Prototyping | `qr-makers-hardware` |

---

## 1. Admin pre-flight

### A1 — Hidden entry + login
1. On a fresh visitor browser, open `/`.
2. Tap `// Laluan Aspirasi` **5 times** (or open `/` as a returning visitor and tap the **MindSwap** logo 5 times within ~2 seconds).
3. Enter the configured `ADMIN_PASSCODE` → **Sign in**.

**Pass:** “Control room” loads with tabs **Overview, Booths, Speakers, Helpdesk, Export**; Overview shows six KPIs including Partner and Quizzes.
**Fail:** wrong passcode shows “Invalid passcode. Try again.”; admin route should never expose data before login.

### A2 — Database write health
1. Go to **Overview**.
2. Check **Database write access**.

**Pass:** green shield + “Admin write access confirmed.”
**Fail:** red banner with the Postgres/RLS error → fix RLS/policies before continuing.

### A3 — Overview KPIs
1. Note **Visitors, Stamps, Avg Rating, Claimed**.
2. Compare with Supabase (`select count(*) from visitors;` etc.).
3. Leave the tab open and collect a stamp in Browser A; wait up to 30s.

**Pass:** KPI numbers move after the 30s refresh; **People’s Choice** and **Best booth standings** render.

### A4 — Booth CRUD
1. **Booths → Add**.
2. Create `TEST Booth A` with faculty `TEST Faculty`, category `Exhibition`, location `Booth T-01, Marquee Tent, High Impact Research Building`, a short description, and **Active** checked.
3. Save.

**Pass:** toast/modal closes, booth appears in the admin list with a generated `qr-<slug>-xxxx` token.
4. Open its QR modal → **Download PNG**.
5. **Edit** the booth → rename to `TEST Booth A (edited)` → save.
6. Toggle **Active (visible to visitors)** off → save.
7. Open `/exhibition` in Browser A.

**Pass:** inactive booth is hidden from visitors but still visible in Admin → Booths. QR PNG downloads and encodes `/checkpoint/<token>` on the **current origin**.
8. Delete `TEST Booth A (edited)` and confirm.

### A5 — QR signage sheet
1. **Booths → QR sheet**.
2. Check all active booths appear with QR, booth name, faculty, location, and token.
3. **Print** → print preview shows only the sheet (toolbar hidden).

**Pass:** 8 active QR cards, no clipping. **Do not print while testing on localhost** — QRs would encode `localhost`. Generate the final sheet on the production domain.

### A6 — Speaker CRUD
1. **Speakers → Add**.
2. Create `TEST Speaker` with position, organisation, `TEST Session`, date `13 Nov 2026`, time, bio; upload a small photo or paste an image URL.
3. Save → open `/talks` in Browser A.

**Pass:** speaker appears on Day 1, photo renders or falls back cleanly.
4. Edit the session to `14 Nov 2026` → save → reload `/talks`; it moves to Day 2.
5. Delete `TEST Speaker`.

### A7 — Helpdesk settings
1. **Helpdesk → Settings**.
2. Confirm current values: threshold `8`, metric “Points (required ×10 + partner ×5 + trail +10 + quiz +5/correct + votes ×25)”, reward title/instructions.
3. **Do not change yet** — you will lower the threshold to `1` for the fast reward test in F3, then restore it to `8`.

### A8 — Export
1. **Export → Booth Visits & Quiz CSV**.
2. Open the CSV.

**Pass:** header includes Visitor ID, Full Name, Username, Matric, Checkpoint Name, Faculty, Booth Type, Rating, Review, Quiz Correct, Quiz Total, Quiz Points, Quiz Completed At, Visited At; rows match collected stamps.
3. **Visitor Identities CSV** → full name, username, matric, faculty.
4. **UM Talk Speaker Votes CSV** → header `Speaker ID,Speaker Name,Faculty / Org,Session Title,Total Votes`.

### A9 — Admin auth isolation
1. Open `/admin` in Browser B (visitor profile, never logged in).

**Pass:** passcode screen, no analytics data.
2. Sign out in Browser C → tabs disappear until passcode is re-entered.

---

## 2. Visitor first run

### B1 — First-run gate
1. Fresh browser → `/`.

**Pass:** “Start your passport” with **Full name**, **Username**, optional **Matric / Student ID**, **Faculty** select, and “No password · No email · One-time setup”.
2. Submit empty → inline error “Please fill in your name and faculty to continue.”
3. Enter `TEST Visitor A`, username `test_visitor_a`, matric `TEST-2026-001`, pick any faculty → **Start passport**.

**Pass:** lands on Home with `WELCOME, TEST.`, `KEMUNCAK ASPIRASI!`, venue **Marquee Tent, High Impact Research Building**, grouped `13–14 Nov 2026 · Free entry`, `0 / 8` required passport, 8 required booths.

### B2 — Returning visitor
1. Reload `/`.

**Pass:** no signup gate again; identity is restored from localStorage.

### B3 — Header profile
1. Tap the profile pill (avatar + name + pencil).

**Pass:** modal “Your profile” with full name, @username, matric, faculty, “Show me on the public leaderboard” checked, and a **Device token** (UUID). Staff can look you up by @username or ID at Helpdesk.
2. Change the name to `TEST Visitor A2` → **Save profile**.

**Pass:** “Profile updated” toast; header and Home greeting update.

### B4 — Navbar
1. Tap every nav item: **Home, Booths, Passport, Scan, Talks**.

**Pass:** each route loads with no layout overflow; active state follows the route; the center **Scan** nav item works.

---

## 3. Booths & floor plan

### C1 — List + search
1. **Booths**.
2. Search `robotics`, then `Marquee Tent`, then `AI`.

**Pass:** results filter by name/faculty/location; empty search shows “No booths match your query”.

### C2 — Category filter
1. Tap each category pill.

**Pass:** only matching booths remain; `All` restores 9.

### C3 — Map view
1. Toggle **Map**.

**Pass:** all booths render on the schematic; no overlaps/clipping; “You were here” marker appears only after a stamp; tapping a booth opens details.
2. Toggle back to **List**.

### C4 — Booth details
1. Tap a booth card → details modal.

**Pass:** photo/fallback, category, name, faculty, location, description, and “Scan booth QR to collect stamp” button. Close via backdrop, X, or Esc.

### C5 — Stamped indicator
1. After collecting a stamp (Section 5), return to **Booths**.

**Pass:** that booth shows the green **STAMPED** badge; others do not.

---

## 4. Scan & staff override

### D1 — Camera start
1. **Scan** on a phone over HTTPS.

**Pass:** camera permission prompt → live preview with corner guides and **Restart camera**.
**Expected variants:** blocked → “Camera permission blocked”; no camera → “Camera unavailable”; both are handled states, not crashes.

### D2 — Valid QR
1. Scan a printed booth QR (or display one on another screen).

**Pass:** routes to `/checkpoint/<token>` with the correct booth and “Validating QR checkpoint…”.
2. Scan a token that does not exist (e.g. `qr-does-not-exist`).

**Pass:** “QR not recognised — No active booth found for …”.

### D3 — Staff override
1. On **Scan**, use **Staff override — manual booth token**.
2. Enter `qr-eng-robotics` + wrong code → **Go**.

**Pass:** “Incorrect override code.”
3. Retry with the configured `STAFF_SCAN_CODE`.

**Pass:** routes to the Robotics checkpoint.

### D4 — Override is not public
1. Check the page copy: override is labelled “For camera failures only. Requires the override code.”

**Pass:** no booth tokens or bypass code are printed on visitor-facing QR signage.

---

## 5. Rating & stamp collection

### E1 — Collect a stamp
1. On a valid checkpoint, pick **4 stars**, write `TEST review`, tap **Submit rating & collect stamp**.

**Pass:** confetti, success view “Congratulations!”, stamp counted, and “View passport & claim rewards”.

### E2 — Duplicate stamp blocked
1. Re-open the same checkpoint URL / rescan the same QR.

**Pass:** “You’ve already visited”, shows your prior rating/review, no extra stamp; leaderboard count does not increase.

### E3 — Validation
1. On a fresh checkpoint, submit with default 5 stars and no review.

**Pass:** allowed (review optional); rating stored as 5.
2. Try submitting twice quickly.

**Pass:** button disables while submitting; only one visit row is created (DB unique constraint).

### E4 — Manual override full sweep (fast path)
1. Use the override with each live required token to collect all 8 booths.
2. Check **Passport**.

**Pass:** `8 / 8`, progress 100%, “Reward unlocked!”, all stamp slots full, `Collected (8)`, `Pending (0)`.

### E5 — Invalid checkpoint page
1. Open `/checkpoint/qr-does-not-exist` directly.

**Pass:** “Invalid checkpoint” with a link back to booths.

### E6 — Review length
1. Paste >200 characters into the review.

**Pass:** input caps at 200.

### E7 — Partner booth + optional quiz
1. Admin → Booths → Add. Create `TEST Partner Booth` with type **Partner**, four quiz options for one question, and mark the correct answer.
2. Visitor scans it and submits a rating.

**Pass:** success says **Partner stamp collected**; required progress does **not** increase; quiz card appears.
3. Submit the quiz with the correct answer.

**Pass:** `1/1 correct · +5 pts`; quiz cannot be submitted twice; leaderboard points increase.
4. Delete `TEST Partner Booth` after testing.

---

## 6. Passport & reward

### F1 — Progress
1. **Passport** with 1 stamp.

**Pass:** `1 / 8` required stamps, correct progress bar, first slot filled, rest numbered.

### F2 — Filters
1. Tap **All / Collected / Pending**.

**Pass:** counts and lists match; empty states read “No stamps yet” or “All booths collected”.

### F3 — Reward unlock (fast test)
1. Admin → **Helpdesk → Settings**: set **Required stamps for reward** to `1` → **Save settings**.
2. Visitor with ≥1 stamp reloads **Passport**.

**Pass:** gold “Reward unlocked!” banner; **Show badge** opens the reward modal with title, instructions, status **READY**, and the visitor ID.
3. **Restore the threshold to `8` immediately after this test.**

### F4 — Helpdesk claim
1. Copy the visitor’s **@username** or **Device token** from the profile modal.
2. Admin → **Helpdesk → Prize claim tool** → paste @username or ID → **Verify**.

**Pass:** full name + @username shown; “Required stamps collected: N”; status **READY**; staff name prefilled `HIR Helpdesk Staff A`.
3. Edit staff name to `TEST Staff`, tap **Mark prize claimed**.

**Pass:** “Souvenir marked as CLAIMED.”
4. Visitor reopens **Show badge** / reloads Passport.

**Pass:** badge shows **CLAIMED**; Admin Overview **Claimed** increments.

### F5 — Ineligible lookup
1. Use a visitor ID with 0 stamps → **Verify**.

**Pass:** “Not eligible yet — needs 8 required stamps.” (or the current threshold).

### F6 — Claim cannot be repeated in UI
1. Re-verify the claimed visitor.

**Pass:** status **CLAIMED** with claim time/staff; no claim button.

### F7 — Reward copy
1. Change reward title/instructions in Helpdesk → save → reload visitor passport/badge.

**Pass:** updated copy appears.

---

## 7. Leaderboard

### G1 — Ranking
1. Collect stamps with 2–3 test visitors (different counts).
2. Open **Leaderboard**.

**Pass:** points order, top 3 podium (2-1-3), ranks 4–50, then full list; your row is highlighted with `(you)` and `Jump to my rank` appears if you are below rank 50; personal card shows `#rank of total`.

### G1b — Day tabs & partner-only ranking
1. On **Leaderboard**, switch **All days / 13 Nov / 14 Nov**.

**Pass:** each tab reloads points for that day only; trail bonus appears on the day the final partner was visited; partner-only visitors still appear if they have any stamp.
2. Leave the page open for 20s.

**Pass:** list refreshes automatically.

### G2 — Privacy opt-out
1. Visitor A → profile → uncheck **Show me on the public leaderboard** → save.
2. Reload Leaderboard.

**Pass:** that visitor appears as **Anonymous** (still ranked, no name).
3. Re-enable to restore the name.

### G3 — Metric switch
1. Admin → Helpdesk → confirm ranking metric is **Points (required ×10 + partner ×5 + trail +10 + quiz +5/correct + votes ×25)**.
2. Switch temporarily to **Booth stamps collected**, save, reload Leaderboard.
3. Restore **Points** afterward.

**Pass:** header changes and scores follow the selected metric.

### G4 — Empty state
1. Use a fresh browser with 0 stamps.

**Pass:** “You’re not ranked yet — collect your first booth stamp” and/or “No rankings yet” when the DB is empty.

---

## 8. UM Talk & People’s Choice

### H1 — Day filter
1. **Talks**.
2. Toggle **Day 1 · 13 Nov** / **Day 2 · 14 Nov**.

**Pass:** sessions filter correctly; combined `13-14 Nov 2026` sessions appear on both days; empty day shows “See the other day”.

### H2 — Cast a vote
1. Pick a speaker → vote button.

**Pass:** success message “Thank you! Your People Choice vote has been recorded.”; badge changes to **Voted**; vote count increments; all vote buttons disable.

### H3 — One vote per visitor
1. Try voting for another speaker.

**Pass:** blocked (“You have already cast your vote…”); no second row in `speaker_votes`.

### H4 — Admin tally
1. Admin → Overview → **People’s Choice**.

**Pass:** vote total and per-speaker counts update within 30s; leader is highlighted gold.

### H5 — Export votes
1. Admin → **Export → UM Talk Speaker Votes CSV**.

**Pass:** totals match the Overview.

---

## 9. Cross-device reclaim

### J1 — Reclaim by matric
1. Visitor A (matric `TEST-2026-001`) collects 1+ stamps.
2. In Browser B, clear `mindswap_*` localStorage → sign up as `TEST Visitor B` with the **same matric** `TEST-2026-001` and any faculty.

**Pass:** “Welcome back — we restored your existing progress.” Passport still shows the original stamps; leaderboard does not double-count the person.

### J2 — Different matric = different visitor
1. Sign up with `TEST-2026-002`.

**Pass:** separate visitor ID and separate progress.

### J3 — No matric
1. Sign up with matric blank, collect a stamp, clear storage, sign up again with a new name and blank matric.

**Pass:** new visitor ID; no reclaim attempted (matric is the reclaim key).

---

## 10. Mobile, accessibility & resilience

### K1 — Device matrix
Test at minimum:

| Device / browser | What to verify |
| --- | --- |
| iPhone Safari (393px) | Camera prompt, sticky header, bottom nav, safe-area insets, no horizontal scroll |
| iPhone SE (320px) | Hero wraps cleanly; date/venue do not clip; buttons remain tappable |
| Android Chrome | Camera, QR decode, back button, no layout shift |
| Desktop Chrome | Admin tables, QR sheet print preview, CSV downloads |
| WhatsApp/Instagram in-app browser | Camera may be restricted; override works; page is still usable |

### K2 — Accessibility
1. Tab through signup, profile modal, and admin forms.

**Pass:** visible focus, labels announced, Esc closes modals, star buttons expose `aria-label`/`aria-pressed`, error messages use `role="alert"`.
2. Run Lighthouse → Accessibility on `/`, `/passport`, `/exhibition`, `/admin`.

**Pass:** no serious/critical issues.

### K3 — Slow / offline
1. Throttle to Slow 3G; load `/` and `/exhibition`.

**Pass:** skeletons/spinners show; no blank crash.
2. Go offline after load; tap a booth.

**Pass:** handled error/fallback, no infinite spinner. (Full offline support is not in scope.)

### K4 — Deep links
1. Open `/checkpoint/qr-eng-robotics`, `/passport`, `/talks`, `/leaderboard`, `/admin` directly.

**Pass:** each resolves; visitor deep links still require identity setup; admin deep links still require passcode.

---

## 11. Cleanup

Run in Supabase SQL editor after testing. This removes only `TEST`-tagged visitors and their cascaded rows.

```sql
-- 1) Remove test votes
delete from public.speaker_votes
where visitor_id in (
  select id from public.visitors
  where display_name ilike 'TEST %' or student_id like 'TEST-%'
);

-- 2) Remove test rewards
delete from public.visitor_rewards
where visitor_id in (
  select id from public.visitors
  where display_name ilike 'TEST %' or student_id like 'TEST-%'
);

-- 3) Remove test stamps
delete from public.booth_visits
where visitor_id in (
  select id from public.visitors
  where display_name ilike 'TEST %' or student_id like 'TEST-%'
);

-- 4) Remove test visitors
delete from public.visitors
where display_name ilike 'TEST %' or student_id like 'TEST-%';

-- 5) Verify no test rows remain
select id, display_name, student_id from public.visitors
where display_name ilike 'TEST %' or student_id like 'TEST-%';
```

Also:
1. **Restore reward threshold to `8`** and ranking metric to **Points**.
2. Delete any `TEST Booth` / `TEST Speaker` records.
3. Clear site data (cookies + localStorage) in test browsers.
4. Re-check Admin → Overview KPIs against the DB.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Admin shows “Database write access” red | RLS/policies missing or server env key wrong | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel; re-run the security migration |
| No booths anywhere | Empty `checkpoints` or wrong project | Seed via SQL; confirm project ref |
| QR opens `localhost` | Sheet generated on dev server | Regenerate on https://feskum-mindswap.vercel.app |
| Camera blocked | HTTP, permission denied, in-app browser | Use HTTPS, allow camera, or staff override |
| “You’ve already collected this stamp!” | Duplicate scan | Expected; one stamp per booth per visitor |
| “That username is already taken” | Username unique index conflict | Choose another username; usernames are case-insensitive |
| Quiz card missing | Booth type is not Partner or quiz is empty | Set booth type to Partner and add questions |
| Reward never unlocks | Stamps < threshold | Lower threshold temporarily or collect more |
| Claim fails | Visitor has no `visitor_rewards` row | Ensure passport was opened after threshold reached; re-verify |
| Vote button stays enabled | Local state stale | Reload `/talks`; check `speaker_votes` unique row |
| Leaderboard name missing | “Show me on the public leaderboard” off | Expected → Anonymous; re-enable to show |
| Reclaim not working | Matric mismatch/blank | Use the exact same non-empty matric |
| Image upload fails | `booth-images` bucket missing/policy | Run storage section of `schema.sql` or paste a URL |
| `/admin` loops on login | sessionStorage blocked/private mode | Allow storage or use a normal window |
| Print sheet includes UI | Print styles overridden | Use the in-app **Print** button; check `@media print` |

---

## 13. Sign-off

- [ ] Admin login, write check, KPIs, booth/speaker CRUD, QR sheet, export
- [ ] Visitor signup with @username, profile edit, privacy opt-out
- [ ] Partner stamps, optional quiz, points/day leaderboard
- [ ] List/map/search/category, booth details, stamped badges
- [ ] Camera scan + invalid QR + staff override
- [ ] Rating, duplicate block, 1–5 stars, review cap
- [ ] Passport progress/filters, reward unlock, helpdesk claim
- [ ] Leaderboard ranking/privacy/metric
- [ ] Talks day filter, one vote per visitor, admin tally
- [ ] Cross-device reclaim by matric
- [ ] 320/393px, Android, desktop, in-app browser
- [ ] Test data cleaned; threshold restored to `8`; metric restored to stamps
- [ ] Final QR sheet generated on production domain

**Tester:** ____________________  **Date:** ____________  **Result:** PASS / FAIL
