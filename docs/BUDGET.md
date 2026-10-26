# Budget Comparison — Hosting, Database & Domain

**Budget:** RM200
**Prepared:** 26 Oct 2026
**Workload:** static Next.js site, ~400 attendees, November 2026 event, Postgres + image storage
**Hosting window:** **1 month only** (no 12-month commitment)

> All prices are **indicative** and converted at **USD 1 ≈ RM4.70**. Verify on the
> provider’s pricing page at purchase; exchange rates and plans change. Printing
> costs are separate — see `DDAY-PRINT.md`.

---

## 1. What we actually need

| Need | Requirement |
| --- | --- |
| Hosting | Serve a static Next.js build over HTTPS, custom domain, ~400 users |
| Database | Small Postgres (a few thousand visits/votes), occasional writes |
| Storage | ~9–12 booth photos (a few MB total) |
| Domain | A proper URL — **not** `*.vercel.app` |
| Monitoring | Uptime alert if the site or DB goes down |
| Duration | **1 month only** (Nov 2026); site can be frozen/taken down after the event |

Traffic is tiny. The real risks are **cold starts/pauses**, **no backups**, and
**the domain**, not bandwidth.

---

## 2. Hosting options

| Option | Free tier | Paid | Verdict |
| --- | --- | --- | --- |
| **Vercel Hobby** (current) | Yes — static, 100 GB bandwidth/mo | Pro **$20/user/mo** (≈ RM94) | Best fit; non-commercial terms apply |
| Netlify | Credit-based (~15 GB) | Pro **$19/mo** (≈ RM89) | Worse value; credit model is easy to exhaust |
| Cloudflare Pages | Unlimited static requests | Workers Paid **$5/mo** (≈ RM24) | Cheapest at scale, but the app needs a rewrite |
| GitHub Pages | Free static | — | No rewrite if fully static, but no Supabase-specific tooling or previews; custom domain possible |
| Railway / Render / Fly | Limited trial | ~$5–7/mo (≈ RM24–33) | More ops overhead for no benefit here |

**Recommendation:** stay on **Vercel Hobby** for the one-month event window.
Upgrade to Pro only if the non-commercial clause becomes a concern or
previews/limits are needed.

---

## 3. Database options

| Option | Free tier | Paid | Verdict |
| --- | --- | --- | --- |
| **Supabase Free** (current) | 500 MB DB, 1 GB storage, ~5 GB egress; **pauses after ~7 days inactivity**; no backups | Pro **$25/mo** (≈ RM118) — 8 GB DB, 100 GB storage, 250 GB egress, daily backups | Keep for free; upgrade for the event month |
| Neon | 0.5 GB, autosuspend | Launch **$19/mo** (≈ RM89) | Would require rewriting the data layer |
| Cloudflare D1 | 5 GB, 5M reads/day | Workers Paid **$5/mo** | Would require a rewrite |
| Railway / Render Postgres | Trial / limited | ~$5–7/mo | Extra ops; no advantage |
| Google Sheets as DB | Free | — | Not suitable for 400 concurrent users |

**Recommendation:** **Supabase Free + keep-alive** during build-up, then
**Supabase Pro for the single event month (Nov 2026)** to remove the pause risk
and get daily backups. Downgrade immediately after the event.

---

## 4. Domain options

| Option | Approx. cost | Notes |
| --- | --- | --- |
| `.com` | **RM50–70 / year** | Recommended; familiar, portable, easy to renew |
| `.my` | RM80–120 / year | Local identity, higher price |
| `.com.my` | RM60–100 / year | Requires business/org details |
| `.vercel.app` subdomain | RM0 | **Rejected** — not a proper event URL |

Buy from Cloudflare Registrar (at-cost), Namecheap, or a local registrar.
Cloudflare Registrar is usually the cheapest `.com` renewal and includes free
DNS/proxy.

> **Hard prerequisite:** connect the domain **before** generating/printing QR
> codes. QR URLs are built from `window.location.origin`.

---

## 5. Monitoring & extras

| Tool | Free tier | Paid | Use |
| --- | --- | --- | --- |
| UptimeRobot | 50 monitors, 5-min checks | $7/mo | Uptime alert + keep-alive ping |
| Better Stack | 10 monitors, 3-min checks | $10/mo | Alternative |
| Sentry | 5k errors/mo | $26/mo | Error tracking (post-event) |
| Plausible / Vercel Analytics | Trial / limited | ~$9/mo | Privacy-friendly analytics (optional) |
| cron-job.org | Free | — | Supabase keep-alive ping |

For the event, **UptimeRobot Free** is enough (alert + keep-alive).

---

## 6. Scenarios

### A. Lean — RM0 hosting + domain only
| Item | Cost |
| --- | --- |
| Vercel Hobby | RM0 |
| Supabase Free | RM0 |
| UptimeRobot Free (keep-alive + alerts) | RM0 |
| `.com` domain (annual registration) | RM60 |
| **Total (event month, incl. domain)** | **≈ RM60** |

**Risk:** Supabase pauses if dormant (mitigated by keep-alive), no backups, no
guaranteed support. Acceptable if you export CSVs daily.

### B. Event-safe — recommended ★
| Item | Cost |
| --- | --- |
| Vercel Hobby | RM0 |
| Supabase Pro × 1 month (Nov) | RM118 |
| UptimeRobot Free | RM0 |
| `.com` domain (annual registration) | RM60 |
| Buffer | RM22 |
| **Total (event month, incl. domain)** | **≈ RM200** |

**Why:** no pause, daily backups, more storage/egress during the event, then
downgrade. Fits the budget exactly.

### C. Cloudflare-only — RM0 platform, but a rewrite
| Item | Cost |
| --- | --- |
| Cloudflare Pages + Workers + D1 + R2 (free tiers) | RM0 |
| `.com` domain (annual registration) | RM60 |
| Optional Workers Paid (if limits exceeded) | RM24/mo |
| **Total (event month, incl. domain)** | **≈ RM60–84** |

**Why not now:** migrating the Supabase data layer (auth-free client writes,
storage, queries) is a multi-day rewrite with new failure modes, weeks before
the event. Revisit only if the site must run at RM0 forever.

### D. Over-provisioned
| Item | Cost |
| --- | --- |
| Vercel Pro | RM94/mo |
| Supabase Pro | RM118/mo |
| Domain | RM60/yr |
| **Total** | **≈ RM212 / month + domain** |

Over budget and unnecessary for a one-day/one-month, 400-person event.

---

## 7. Recommended allocation of RM200

| Item | RM |
| --- | --- |
| `.com` domain — annual registration | 60 |
| Supabase Pro — 1 month (Nov 2026) | 118 |
| Buffer (FX fluctuation / renewal) | 22 |
| **Total for the event month** | **200** |

Vercel Hobby and UptimeRobot remain free. The domain is the only annual item;
everything else is cancelled or downgraded after the event month.

**If printing must also fit inside RM200:** use Scenario A (RM60) and keep
~RM140 for print. The print estimate in `DDAY-PRINT.md` is RM117–184, so a
lean print run (A4 instead of A2, existing stands) lands near RM100–140.

---

## 8. One-month plan (recommended)

**Target event dates:** 13–14 Nov 2026. The hosting cost does not change with
the exact event days; the one-month window covers build-up, event, and teardown.

| When | Action | Cost |
| --- | --- | --- |
| ~1 Nov | Upgrade Supabase to Pro for **1 month**; deploy final build; connect domain | RM118 + domain |
| 1–10 Nov | Production testing, QR print run on the final domain, CSV backup drill | RM0 |
| 13–14 Nov | Event days; monitor DB, export CSVs after sessions | RM0 |
| 15 Nov | Final export; freeze writes / take the site down if no longer needed | RM0 |
| ~30 Nov | Downgrade Supabase Pro; keep the domain registered | RM0 |

**Key point:** you cannot buy a domain for one month — registration is annual.
If you want a **RM0 platform month**, use:

- Vercel Hobby — RM0
- Supabase Free + daily keep-alive — RM0
- `.vercel.app` URL — RM0 (but not recommended for printed QR codes)

That version costs **RM0 for the month** but keeps the `*.vercel.app` URL. The
RM60 domain is what makes the event link look professional and stable on print.

---

## 9. Free-tier gotchas to watch

- **Supabase pause:** Free projects pause after ~7 days with no activity. A
  daily ping to the REST endpoint (UptimeRobot/cron-job.org) keeps it awake.
  Monitor the *database*, not just the homepage, because a static page can stay
  up while the DB is paused.
- **Supabase backups:** Free has none. Export CSVs after each event day.
- **Vercel Hobby:** non-commercial use, fair-use bandwidth. Fine for a student
  event; review if the site becomes a permanent commercial property.
- **Egress:** 400 attendees × booth photos can add up. Compress images before
  upload; 5 GB free egress is normally plenty for the event window.
- **Domain renewal:** budget for RM50–70 **every year**, not just year one.

---

## 10. Recommendation

1. Buy a **`.com`** now (~RM60, annual — cannot be bought for 1 month).
2. Keep **Vercel Hobby** (RM0).
3. Run **Supabase Free + keep-alive** during build-up.
4. Upgrade to **Supabase Pro for November only** (~RM118) — backups + no pause.
5. Add **UptimeRobot Free**.
6. Export CSVs after the event, then **downgrade Supabase immediately**.

**Expected spend for the one-month event window: ≈ RM60 (lean) to RM200
(event-safe, including domain), within budget.** The remaining risk is
operational (domain timing, QR printing, venue connectivity), not cost.
