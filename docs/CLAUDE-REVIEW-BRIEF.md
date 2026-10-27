# Claude Review Brief — MindSwap @ FESKUM 2026

**How to use:** attach `docs/screenshots/home-393.png` and `docs/screenshots/home-320.png`, then paste everything below the line into Claude. Ask for a critique, not a rewrite of the whole app.

---

You are a senior product designer, UX writer, and frontend engineer. Review the attached mobile screenshots of a live event web app and give me a blunt, specific critique. Do not flatter the design. I want it to feel **more professional and less cringe**, while keeping the existing visual theme, and I want the **flow and UI to be friendlier**. Focus on what a real attendee, exhibitor, or university officer would notice in the first 30 seconds.

## 1. The product

- **Event:** MindSwap @ FESKUM 2026 — a student-run faculty exhibition under the “Laluan Aspirasi” banner.
- **Venue:** Marquee Tent, High Impact Research Building, Universiti Malaya.
- **Date:** **13–14 Nov 2026**.
- **Audience:** ~400 Universiti Malaya students (18–24), faculty exhibitors, secretariat, judges, and sponsors.
- **Booths:** 8 required faculty/innovation booths, plus optional partner/promotional booths. Each has a QR code at the physical booth.
- **Core loop:** visitor enters full name + unique @username + optional matric + faculty → browses booths → scans a booth QR → rates the booth 1–5 stars with an optional review → collects a stamp → 8 **required** stamps unlock a souvenir → may visit partner booths for bonus points → may answer an optional 2-question partner quiz → shows the reward badge at the helpdesk → can also vote once for the UM Talk People’s Choice award.
- **Leaderboard:** points-based (required ×10, partner ×5, partner trail +10, quiz +5/correct, vote ×25), top-3 podium, ranks 4–50, full list, All/Day 1/Day 2 tabs, @usernames only.
- **Admin:** hidden passcode-protected “Control room” for KPIs, booth CRUD (required/partner + quiz editor), printable QR sheets, speaker CRUD, reward settings, prize claims by @username or Visitor ID, and CSV exports.
- **No accounts:** no email, password, or login. Identity is a localStorage visitor ID, with optional reclaim by matric on a new device. Full name stays private; the public leaderboard uses @username.
- **Tech:** Next.js 15 App Router, React 19, TypeScript, Tailwind v3, Supabase (Postgres + storage), Vercel. Mobile-first, mostly static, designed for a one-month event window.
- **Budget:** RM200 total. Website only needs to be live for **1 month** (Nov 2026). Vercel Hobby is RM0; Supabase Free is RM0 (or Pro ~RM118 for one month); a `.com` domain is ~RM60/year (annual only, cannot be bought for one month). Printing is separate (~RM117–184). Recommendations must respect this.

## 2. Current visual theme (keep this)

- Industrial-brutalist / print-poster energy: cream paper background, near-black ink, signal red, amber gold.
- Colors: cream `#f8f6f0`, ink `#0f172a`, brand red `#e63946`, gold `#f59e0b`.
- Type: **Anton** for display headlines, **Space Grotesk** for body, **Space Mono** for data/IDs.
- 2px ink borders, hard offset shadows, sticker labels, uppercase micro-labels, high contrast, dense cards.
- The theme is intentional. Do **not** propose a generic SaaS look, soft gradients, glassmorphism, or a full rebrand. The goal is to make this theme feel **credible and controlled**, not to remove its personality.

## 3. What is on the attached Home screenshot

At 393px and 320px wide:

1. Sticky header: `MINDSWAP 2026` logo, trophy shortcut, profile pill (`@test_prod` + pencil).
2. Hero card: “Laluan Aspirasi” sticker, `FESKUM 2026`, `WELCOME, TEST.`, huge `KEMUNCAK ASPIRASI!`, “Explore faculty booths. Collect stamps. Vote for your favourite.”, venue, and a grouped `13–14 Nov 2026 · Free entry` line.
3. Passport widget: `0 / 8` required, progress bar, “8 more required stamps”, `OPEN`, partner count if any.
4. Two action cards: Booths / Leaderboard.
5. Red “SCAN A BOOTH” CTA.
6. “How it works” 3-step strip.
7. Featured booths grid (partly below the fold).
8. Flat five-item bottom nav: Home, Passport, Scan, Booths, UM Talk.

Other screens in the flow (not attached): Booths list/map, Booth detail modal, Checkpoint rating page, Passport with stamp slots, Reward badge modal, Talks/voting, Leaderboard, Admin control room.

## 4. What I suspect is “cringe” or unprofessional

Be honest about which of these are real problems and which are fine:

- Copy is still hyped in places: “KEMUNCAK ASPIRASI!”, “Legendary.”, “crown the Best Faculty Booth”, “Souvenir marked as CLAIMED.”
- Too many competing elements at once: sticker + eyebrow + giant headline + another sticker + borders + shadows + bottom nav.
- The hero still leads with a slogan before a first-time visitor’s job-to-be-done.
- The home screen has both a passport widget and a navy bottom-nav Passport item; check whether the duplicate entry point is earning its space.
- The first-run gate asks for name/username/faculty before the visitor sees any value.
- Partner booths and quizzes add optional choices; check that they do not compete with the required 8-stamp path.
- Admin users now have a Home button, but the tab bar, back arrows, and sign-out may still feel like a separate app.
- Reward claim can use @username, but staff still need a fast, unambiguous handoff at a busy helpdesk.
- The 320px layout is tight; body copy and labels get very small.

## 5. What I want from you

Give a prioritized critique with concrete fixes. Structure your answer like this:

### A. First impression (5 bullets max)
What feels credible, what feels amateur, and why. Reference specific regions of the screenshot.

### B. The “cringe” diagnosis
List the exact words, visual patterns, or interaction choices that create the cringe feeling. Separate **copy**, **visual density**, and **flow**.

### C. Priority fixes
A table with `P0 / P1 / P2`, the issue, the fix, impact, and rough effort (hours or days). P0 = must fix before the event; P1 = strong improvement; P2 = nice-to-have.

### D. Copy rewrite
A before/after table for the highest-impact strings. Quote the current copy exactly and propose a calmer, more professional alternative that still sounds like a student event, not a corporate brochure. Cover at minimum:
- hero headline/subtitle
- greeting
- primary CTA
- passport widget
- reward unlocked/claimed states
- empty states
- error messages
- admin labels

### E. Home screen hierarchy
Propose a revised order and grouping of the home sections. Say what to cut, merge, or move below the fold. Give a simple text wireframe. Keep the theme.

### F. Flow and UI friendliness
Concrete improvements for:
1. First-run signup (show value before asking for data; fewer fields; clearer expectations).
2. Scan → rate → stamp (reduce taps, make success obvious, handle duplicate scans).
3. Passport → reward → helpdesk claim (make the @username/ID handoff fast and unambiguous).
4. Admin navigation (home, back, tabs, sign out).
5. Cross-device reclaim by matric.
6. Leaderboard, day tabs, partner/quiz points, and voting (make the “one vote” rule obvious).

### G. Visual tightening
Specific rules for:
- type scale and line length at 320/393px
- spacing rhythm
- when to use a sticker vs. an eyebrow vs. a badge
- border/shadow weight
- color usage (where red should and should not be used)
- how to keep the flat five-item nav legible at 320px
- how to keep Anton headlines from feeling shouty

### H. Accessibility and mobile QA
Tap targets, contrast, focus states, safe-area insets, 320px overflow, reduced motion, screen-reader labels, and in-app browser camera fallbacks.

### I. What NOT to change
List the parts of the current design or flow that are already working and should be protected.

### J. 1-day and 3-day plans
- **1-day quick wins:** the highest-impact changes one person can ship today.
- **3-day polish:** the next tier, still within the existing stack and budget.

## 6. Constraints

- Keep the industrial-brutalist theme and the existing brand colors/fonts.
- Mobile-first, 320–430px, one-handed use, outdoor/bright venue.
- No login, email, password, or auth provider.
- Do not break QR scanning, the one-time signup, admin passcode, or CSV exports.
- No heavy dependencies, no server rental, no paid design tools required.
- Budget: RM200 total; website live for **1 month only**. Prefer free tiers; only the domain is annual.
- If you recommend a new tool or service, state its cost and why it fits the one-month window.
- Do not invent pages or data you cannot see. If you need more screenshots (Booths, Passport, Admin), ask for them.

## 7. Output style

- Be direct and specific. No generic “improve contrast” advice without naming the element and the replacement.
- Reference the screenshot regions by name (header, hero, passport widget, CTA, etc.).
- Prefer exact copy and concrete layout rules over abstract principles.
- If something is subjective, say so and give the trade-off.
- End with the **single change** that would most improve the professional feel, and the **single change** that would most improve the flow.
