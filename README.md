# MindSwap @ FESKUM 2026

Digital passport, exhibition guide, and People's Choice voting for **MindSwap @ FESKUM 2026** — Marquee Tent, High Impact Research Building, Universiti Malaya, **13–14 Nov 2026**.

**Live:** https://feskum-mindswap.vercel.app

---

## What it does

| Area | Description |
| --- | --- |
| Passport | Students collect stamps by scanning booth QR codes (8 stamps = prize). |
| Booths | Browsable exhibition list with photos, faculty, location, ratings, and a **List ⇄ Map** toggle. |
| Scanning | In-browser QR scanner plus a staff manual-token override. |
| Ratings | 1–5 stars + optional review per booth, deduplicated per device. |
| Leaderboard | Best booths and top visitors, aggregated client-side. |
| UM Talk | Speaker cards and **People's Choice** voting (one vote per device). |
| Admin | Hidden, passcode-protected dashboard: booths, speakers, helpdesk, exports, live tallies. |
| Print | Printable booth QR sheet for laminating and mounting. |

No student login, no password, no email. Identity is kept in a signed, HttpOnly session cookie, with local storage used only for display continuity.

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 3**
- **Supabase** (Postgres + Storage) accessed through server-only route handlers with the service-role key
- `html5-qrcode` (scanning), `qrcode` (print sheet), `canvas-confetti` (rewards)
- **Vercel** hosting; Next.js route handlers for visitor sessions, admin auth, data, and uploads

---

## Quick start

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev                     # http://localhost:3000
```

Build and run production locally:

```bash
pnpm build
pnpm start
```

Phone testing on the same network:

```bash
pnpm dev:mobile              # binds 0.0.0.0
```

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL (server only). |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service-role key. **Server only — never prefix with `NEXT_PUBLIC_`.** |
| `SESSION_SECRET` | yes | At least 32 random bytes for signing visitor/admin cookies. |
| `ADMIN_PASSCODE` | yes | Shared organiser passcode. Server only. |
| `STAFF_SCAN_CODE` | yes | Separate camera-failure override code. Server only. |

> The browser never receives the service-role key. Visitor and admin sessions are signed HttpOnly cookies. Do not put any of the server secrets in `NEXT_PUBLIC_*` variables.

---

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Home / entry |
| `/exhibition` | Booth list + map (List ⇄ Map) |
| `/passport` | Stamps, progress, prize badge |
| `/scan` | QR scanner + manual override |
| `/talks` | UM Talk speakers + People's Choice voting |
| `/leaderboard` | Best booths + top visitors |
| `/checkpoint/[id]` | Booth check-in + rating form |
| `/admin` | Admin login (hidden) |
| `/admin/booths` | Manage booths + QR print sheet |
| `/admin/booths/print` | Printable QR sheet |
| `/admin/speakers` | Manage speakers + voting event |
| `/admin/rewards` | Reward threshold / prize settings |
| `/admin/export` | CSV exports (booth visits, speaker votes) |

---

## Admin access

The admin entry is intentionally hidden.

1. Tap the **MindSwap logo 5×** (or, on the first-open screen, tap `// Laluan Aspirasi` 5×).
2. Or open `/admin` directly.
3. Enter the organiser passcode configured in the Vercel `ADMIN_PASSCODE` secret.

The passcode and staff override code are server-only. Ask the event lead for the current values; never put them in the repository or public chat.

---

## Project structure

```
src/
  app/                 App Router pages (home, exhibition, passport, scan, talks, admin…)
  components/          IdentityGate, Modal, FloorPlanMap, Header, Navbar, cards…
  lib/
    supabase.ts        Client API wrapper (fetch to server route handlers)
    server/            Server-only DB, sessions, and service-role client
    visitor.ts         Visitor identity + session bootstrap
    floorplan.ts       Floor-plan config + schematic layout
    faculties.ts       Student faculty list
    types.ts           Shared TypeScript types
  app/api/             Visitor/admin data, auth, upload, and scan routes
supabase/
  schema.sql           Tables, indexes, seed data
  migrations/          Security-definer server access policies
public/                Icons and optional floor-plan image
docs/                  Operations, memo, budget, and print guides
```

---

## Database

Run `supabase/schema.sql` in the Supabase SQL editor for a fresh project. It creates:

`visitors`, `checkpoints` (booths), `booth_visits`, `reward_settings`, `visitor_rewards`, `speakers`, `voting_events`, `speaker_votes`, plus indexes, RLS policies, and the `booth-images` storage bucket.

**Important:** RLS is locked down. Browser clients cannot read or write tables or storage directly. All access goes through server route handlers using the service-role key, with visitor/admin sessions enforced by signed HttpOnly cookies. Apply `supabase/migrations/20261031_harden_server_access.sql` to an existing project.

---

## Documentation

| Document | What it covers |
| --- | --- |
| [`docs/TESTING.md`](docs/TESTING.md) | Full admin→visitor test plan: checklists, edge cases, reset SQL, device matrix. |
| [`docs/EVENT-OPS.md`](docs/EVENT-OPS.md) | On-the-ground runbook: QR placement, connectivity, helpdesk, day-of checklist, fallbacks. |
| [`docs/DDAY-PRINT.md`](docs/DDAY-PRINT.md) | Everything to print for D-Day: quantities, sizes, copy templates, print budget, kit list. |
| [`docs/PROJECT-MEMO.md`](docs/PROJECT-MEMO.md) | What is done, known limitations, improvement backlog, decisions, open questions. |
| [`docs/BUDGET.md`](docs/BUDGET.md) | Hosting/DB/domain options and cost comparison against the RM200 budget. |

---

## Deployment

```bash
pnpm dlx vercel@latest deploy --prod
```

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ADMIN_PASSCODE`, and `STAFF_SCAN_CODE` in **Vercel → Project → Settings → Environment Variables**, then redeploy. All five must be available to the production deployment.

Before printing any QR code, connect the **final domain** — QR URLs are built from `window.location.origin`, so a domain change invalidates every printed code.

---

## License

Internal event project for FESKUM, Universiti Malaya. Not for public redistribution.
