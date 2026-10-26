# Project Memo — MindSwap @ FESKUM 2026

**Last updated:** 26 Oct 2026
**Event:** 13–14 Nov 2026 · Marquee Tent, High Impact Research Building, Universiti Malaya
**Status:** Live in production
**Live URL:** https://feskum-mindswap.vercel.app

This memo is the working memory for the project: what is finished, what is risky, what to improve next, why decisions were made, and what still needs an answer.

---

## 1. Snapshot

| Item | Current state |
| --- | --- |
| Hosting | Vercel (Hobby), static Next.js build |
| Database | Supabase Postgres + Storage (`booth-images`) |
| Live booths | 9 (all have images) |
| Speakers | 16 UM Talk speakers |
| Tables | `visitors`, `checkpoints`, `booth_visits`, `reward_settings`, `visitor_rewards`, `speakers`, `voting_events`, `speaker_votes` |
| Student auth | None — name + faculty (matric optional), stored in `localStorage` |
| Admin | Hidden entry + shared passcode (default `admin2026`) |
| Reward | 8 stamps |
| Domain | **Not final** — still `*.vercel.app` |
| Budget | RM200 for hosting/domain (see `BUDGET.md`) |

---

## 2. What is done

### Product & UX
- [x] Students-only single user type; removed “Visitor / Non-UM guest”.
- [x] First-open form simplified to **name + faculty required, matric optional**.
- [x] Faculty input is a native `<select>` (fixes the iOS/iPad popup bug).
- [x] De-jargoned copy; home highlights **Booths** + **Leaderboard**; passport stays in the widget and nav.
- [x] Nav renamed “Explore” → “Booths”; admin shield removed.
- [x] Whole booth card is tappable; details open in a scrollable, focus-trapped modal.
- [x] **List ⇄ Map** toggle inside Booths (no extra tab).
- [x] Schematic floor plan with numbered, tappable booth nodes.
- [x] “You were here” highlights the **last scanned booth** (no GPS permission).
- [x] Passport stamps, progress bar, prize badge, and reward celebration.
- [x] Booth rating (1–5 stars) + optional review.
- [x] Leaderboard (best booths + top visitors, masked names, opt-out in profile).
- [x] UM Talk speaker cards + People’s Choice voting.

### Bug fixes
- [x] iOS/iPad faculty picker (`<datalist>` → `<select>`).
- [x] Exhibition details not showing on phones (modal scroll + tappable card).
- [x] UM Talk list empty because seed dates use `13-14 Nov 2026`; filter now treats that as both days.
- [x] iOS zoom-on-focus (16px inputs, viewport no longer locks zoom).
- [x] Bottom nav overlapping home-indicator area (safe-area padding).
- [x] Broken featured-booth links on Home (`/scan` → `/exhibition`).
- [x] Leaderboard merge by matric no longer turns named users into “Anonymous”.
- [x] Speaker schedule split across 13/14 Nov; combined dates no longer duplicate every talk on both day tabs.
- [x] Removed the raised floating scan button; the flat 5-item nav no longer covers content.
- [x] Added a direct **Home** button to the admin header.
- [x] Admin **Visitors** KPI now counts registered identities, not only visitors with stamps; empty rating shows `0.00`.
- [x] Removed live test speaker and its 4 test votes; event programme is back to 16 speakers across 13/14 Nov.
- [x] Cleared the one inappropriate test review text from the live booth visit (5-star rating preserved).

### Admin
- [x] Hidden entry: 5 taps on the logo (or `// Laluan Aspirasi` on first open) → `/admin`; direct URL fallback.
- [x] Passcode gate + hint retained.
- [x] Overview: KPIs, DB write health, best-booth standings, **People’s Choice live tally** (30s refresh).
- [x] Booths: add/edit, photo upload, per-booth QR, printable QR sheet.
- [x] Speakers: manage 16 speakers and voting event.
- [x] Helpdesk: verify Visitor ID, mark prize claimed.
- [x] Export: booth-visit CSV + speaker-vote CSV.
- [x] Rewards: configurable threshold.

### Accessibility & mobile
- [x] Removed global `select-none` and zoom-blocking viewport settings.
- [x] Shared accessible `Modal` (`role="dialog"`, `aria-modal`, Escape, focus trap, backdrop close, scroll lock).
- [x] Labelled inputs (`htmlFor`/`id`/`name`/`autocomplete`) and icon buttons (`aria-label`).
- [x] `aria-live` status/error regions.
- [x] Image `width`/`height` to reduce layout shift.
- [x] `text-wrap: balance`, `touch-action: manipulation`, safe-area utilities.
- [x] Tested build on 375px-wide viewport; all routes return 200.

### Documentation & ops
- [x] `README.md` — setup, env, routes, structure, deployment.
- [x] `docs/EVENT-OPS.md` — runbook: QR placement, connectivity, helpdesk, day-of checklist.
- [x] `docs/DDAY-PRINT.md` — print quantities, sizes, copy, budget, kit list.
- [x] `docs/BUDGET.md` — hosting/DB/domain comparison vs RM200.
- [x] `docs/PROJECT-MEMO.md` — this file.

### Infrastructure
- [x] Static-capable build (no API routes, middleware, server actions, or `next/image`).
- [x] Leaderboard aggregated client-side; only polling is the navbar (4s) and admin tally (30s).
- [x] Favicon/icon set (SVG, PNG, maskable, apple-touch, ICO) + web manifest.
- [x] Production deploy verified; routes and new bundles confirmed live.

---

## 3. Known limitations & risks

| Risk | Impact | Current mitigation | Priority |
| --- | --- | --- | --- |
| Admin passcode is `NEXT_PUBLIC_*` and visible in the JS bundle | Anyone who reads the bundle can open admin | Change passcode before event; share only with leads; monitor data | High |
| RLS is fully open (`USING (true)`) with a public anon key | Anyone can read/write/delete rows | No sensitive data; take backups; consider server-side writes later | High |
| Duplicate control is per-device (`localStorage`) only | Clearing storage creates a “new” student | Low-stakes event; spot-check at helpdesk; unique DB constraints still apply per identity | Medium |
| Supabase Free pauses after ~7 days of inactivity | App fails on first use if dormant | Keep-alive ping; or 1 month of Pro (recommended) | High |
| No automated backups on Supabase Free | Data loss if something goes wrong | Daily CSV exports; Pro gives daily backups | High |
| Vercel Hobby is for non-commercial use | Possible terms issue | FESKUM event is non-commercial; upgrade only if required | Low |
| Domain not final (`*.vercel.app`) | QR codes cannot be printed safely | **Buy/connect domain before printing**; regenerate QR after | Critical |
| Floor plan is schematic, not the real venue plan | Map is less useful | Drop in `public/floorplan.png` + coordinates in `src/lib/floorplan.ts` | Medium |
| No offline/PWA cache | Weak venue Wi-Fi = blank app | Hotspot + paper tally fallback; future service worker | Medium |
| No server-side rate limiting | Spam votes/visits possible | Device dedupe + unique constraints; monitor | Medium |
| Shared admin passcode, no audit log | Cannot trace who changed what | Brief staff; export before/after changes | Medium |
| No error monitoring or analytics | Problems found only by attendees | UptimeRobot; add Sentry later | Low |
| `next lint` has no ESLint config | Lint command prompts instead of running | Build + `tsc --noEmit` are the gate | Low |
| Only 9 of the planned 12 booths are seeded | Missing booths cannot be scanned | Confirm final booth list; add before printing | High |

---

## 4. What can be done better

### P0 — before the event (do these first)
- [ ] **Buy and connect the final domain.** Then regenerate and test the QR sheet. Do not print before this.
- [ ] Rotate `NEXT_PUBLIC_ADMIN_PASSCODE` and `NEXT_PUBLIC_SCAN_BYPASS_CODE` in Vercel; redeploy; test on a phone.
- [ ] Confirm the final booth list (9 live vs 12 planned); add missing booths with unique `qr_token`s and images.
- [ ] Walk the venue: test campus Wi-Fi + mobile data, QR scanning under venue light, and load time on a mid-range phone.
- [ ] Run the device matrix (iPhone Safari, iPad Safari, Android Chrome, ≤375px).
- [ ] Set the reward threshold and test the full flow: scan → stamp → 8 stamps → badge → helpdesk verify → mark claimed.
- [ ] Add the real floor plan image + coordinates if the venue provides one.
- [ ] Set up UptimeRobot (or similar) on the production URL.
- [ ] Add a Supabase keep-alive ping (or upgrade to Pro for the event month).
- [ ] Export a baseline CSV and delete test visits/votes before doors open.
- [ ] Print `docs/DDAY-PRINT.md` materials (matte laminate, not gloss).

### P1 — high value, can ship before or shortly after
- [ ] Move admin auth server-side (Supabase Edge Function + signed cookie) so the passcode is not in the bundle.
- [ ] Tighten RLS and route writes through an Edge Function with rate limiting.
- [ ] Add a service worker / offline fallback page (PWA install already supported by the manifest).
- [ ] Replace polling with Supabase Realtime for the leaderboard and People’s Choice.
- [ ] Automate Google Sheets export (scheduled CSV or Apps Script) for the secretariat.
- [ ] Add error tracking (Sentry free tier) and privacy-friendly analytics.
- [ ] Add a stable short-link/redirect domain so future domain changes do not require reprinting QR codes.
- [ ] Add Open Graph/social preview image and metadata.
- [ ] Load test 400 concurrent scans/votes (k6 or Artillery) against a staging project.
- [ ] BM/EN language toggle.
- [ ] Re-run an accessibility audit after final content is in.

### P2 — post-event / long-term
- [ ] Full Cloudflare migration (Pages + Workers + D1 + R2) if the project must run at RM0 indefinitely.
- [ ] Admin roles + audit log (who changed/claimed what).
- [ ] Prize inventory tracking.
- [ ] Post-event data retention and deletion policy.
- [ ] Reusable template for future FESKUM events (config-driven event name, dates, booths).
- [ ] Native app or installable PWA onboarding.

---

## 5. Decisions log

| Date | Decision | Why |
| --- | --- | --- |
| Oct 2026 | Students-only, single user type | Secretariat feedback; less confusion |
| Oct 2026 | Name + faculty required, matric optional | Fast signup at the door |
| Oct 2026 | Keep UM Talk voting in-app, not Google Forms | Database already enforces one vote per visitor; no extra login |
| Oct 2026 | Floor plan as List ⇄ Map inside Booths | Avoids a 6th nav tab |
| Oct 2026 | “You were here” = last scanned booth | No GPS permission or indoor positioning needed |
| Oct 2026 | Hide admin entry, keep passcode + hint | Cleaner student UI; still accessible to staff |
| Oct 2026 | Stay on Vercel + Supabase | Lowest risk before the event; Cloudflare would need a rewrite |
| Oct 2026 | QR URLs from `window.location.origin` | Simple and stateless — but makes the final domain a hard prerequisite |
| Oct 2026 | Schematic floor plan first | Real venue plan not yet available |

---

## 6. Open questions

- What is the final domain, and who buys/owns it?
- Supabase **Free + keep-alive** or **Pro for the event month**? (Budget supports Pro.)
- Is the final booth count 9 or 12?
- Will the venue provide a real floor-plan image?
- Is the event considered non-commercial under Vercel Hobby?
- Who owns the Vercel, Supabase, and domain accounts after the event?
- How long should visitor data be retained after the event?
- Does the secretariat want the proposal in English or Bahasa Melayu, and in `.docx` or Markdown?

---

## 7. Pre-event countdown

### T–14 days
- [ ] Domain connected; HTTPS verified.
- [ ] Final booth list + images frozen.
- [ ] Passcode rotated; staff briefed.
- [ ] Supabase Pro (or keep-alive) active.
- [ ] UptimeRobot monitor live.

### T–7 days
- [ ] QR sheet generated from the final domain.
- [ ] One test card scanned on iPhone + Android.
- [ ] All print materials produced (matte laminate).
- [ ] Device matrix passed.
- [ ] Helpdesk runbook printed.

### T–1 day
- [ ] Venue walk-through; signs mounted.
- [ ] Hotspot + power bank charged.
- [ ] Test data removed; baseline CSV exported.
- [ ] Admin device logged in; write-health green.

### Event day
See `docs/EVENT-OPS.md` §9.

---

## 8. Where things live

| Need | Document |
| --- | --- |
| Setup, routes, deployment | `README.md` |
| Run the event on the ground | `docs/EVENT-OPS.md` |
| Print quantities and copy | `docs/DDAY-PRINT.md` |
| Cost comparison | `docs/BUDGET.md` |
| Schema | `supabase/schema.sql` |
| Floor-plan config | `src/lib/floorplan.ts` |
| Data layer | `src/lib/supabase.ts` |
