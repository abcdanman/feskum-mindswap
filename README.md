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

No student login, no password, no email. Identity lives in `localStorage` on the device.

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 3**
- **Supabase** (Postgres + Storage) via `@supabase/supabase-js`
- `html5-qrcode` (scanning), `qrcode` (print sheet), `canvas-confetti` (rewards)
- **Vercel** hosting; static-capable build (no API routes, no server actions)

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
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon/public key. |
| `NEXT_PUBLIC_ADMIN_PASSCODE` | no | Defaults to `admin2026`. **Public** (baked into the client bundle). |
| `NEXT_PUBLIC_SCAN_BYPASS_CODE` | no | Manual-override code. Defaults to the admin passcode. **Public.** |
| `VERCEL_OIDC_TOKEN` | no | Added automatically by Vercel tooling; not used by the app. |

> `NEXT_PUBLIC_*` values are shipped to the browser. Do **not** put real secrets there. The current admin passcode is a deterrent, not strong authentication — see `docs/PROJECT-MEMO.md`.

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
3. Enter the passcode (default `admin2026`).

Change the passcode via the Vercel environment variables before the event, then redeploy.

---

## Project structure

```
src/
  app/                 App Router pages (home, exhibition, passport, scan, talks, admin…)
  components/          IdentityGate, Modal, FloorPlanMap, Header, Navbar, cards…
  lib/
    supabase.ts        Data layer (booths, visits, votes, analytics, rankings)
    visitor.ts         localStorage identity
    floorplan.ts       Floor-plan config + schematic layout
    faculties.ts       Student faculty list
    types.ts           Shared TypeScript types
supabase/
  schema.sql           Tables, indexes, RLS, and seed data
public/                Icons and optional floor-plan image
docs/                  Operations, memo, budget, and print guides
```

---

## Database

Run `supabase/schema.sql` in the Supabase SQL editor for a fresh project. It creates:

`visitors`, `checkpoints` (booths), `booth_visits`, `reward_settings`, `visitor_rewards`, `speakers`, `voting_events`, `speaker_votes`, plus indexes, RLS policies, and the `booth-images` storage bucket.

**Important:** RLS is currently open (`USING (true)`) because there is no student auth. The anon key is public by design. See the risk notes in `docs/PROJECT-MEMO.md`.

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

Set the two Supabase variables (and optional passcode overrides) in **Vercel → Project → Settings → Environment Variables**, then redeploy.

Before printing any QR code, connect the **final domain** — QR URLs are built from `window.location.origin`, so a domain change invalidates every printed code.

---

## License

Internal event project for FESKUM, Universiti Malaya. Not for public redistribution.
