# D-Day Print & Physical Checklist — MindSwap @ FESKUM 2026

Everything to **print, mount, and prepare physically** for 13–14 Nov 2026 at
Marquee Tent, High Impact Research Building, Universiti Malaya.

> **Do not print any QR code until the final domain is connected.** QR URLs are
> generated from `window.location.origin`. If the domain changes, every printed
> QR breaks. Generate the QR sheet **after** the domain is live.

Companion docs: `EVENT-OPS.md` (runbook), `PROJECT-MEMO.md` (status/backlog).

---

## 1. Master print list

Quantities assume **8 required live booths**, plus any partner booths. Adjust if the final count changes.

| # | Item | Qty | Size | Material | Finish | Purpose |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Booth QR cards | 8 required + partners + 3 spares | A5 | 250–300 gsm | **Matte** laminate | Main booth interaction |
| 2 | Booth number tent cards | 8 required + partners | A5 folded | 300 gsm | None | Match booth to map |
| 3 | Entrance poster | 2 | A2 | 200 gsm on foam board | Matte | App QR + “how it works” |
| 4 | “How it works” strip | 2 | A3 | 250 gsm / foam | Matte | Queue at entrance |
| 5 | UM Talk stage poster | 2 | A2 | Foam board | Matte | Stage + seating |
| 6 | Directional signs | 4 | A3 | Foam board | Matte | Aisles → booths/stage |
| 7 | Helpdesk redemption sign | 1 | A3 | Foam board | Matte | Prize collection point |
| 8 | Manual override card | 2 | A5 | 250 gsm | Matte | One per helpdesk station |
| 9 | Helpdesk runbook | 3 | A4 | Paper | None | Helpdesk, director, backup |
| 10 | Booth token list | 3 | A4 | Paper | None | Manual fallback |
| 11 | Test QR sheet | 2 | A4 | Paper | None | Secretariat/dev testing |
| 12 | Paper tally forms | 100 | A5 | Paper | None | Network-down fallback |
| 13 | Volunteer briefing sheet | 6 | A4 | Paper | None | One per volunteer |
| 14 | Staff identifiers | 8 | A6 badge | Card | None | “STAFF” so attendees can find help |

**Notes**
- Use **matte** laminate on QR signs. Gloss reflects venue lights and can stop
  phone cameras from scanning.
- A5 is enough for a table-top sign; use A4 if signs are mounted further away.
- Keep `#8`, `#9`, `#10`, and `#11` **off public walls** — they contain staff
  codes/tokens.

---

## 2. QR specifications

| Property | Requirement |
| --- | --- |
| Minimum printed size | 3 × 3 cm (close scan) · **5 × 5 cm** recommended (standing) |
| Quiet zone | At least 4 modules of white space on all sides |
| Contrast | Dark foreground on light background; no gradients |
| Error correction | Medium (M) or Quartile (Q) |
| Finish | Matte; avoid glare, reflections, and direct sunlight |
| Placement | Eye level ~1.4 m; not behind glass or plastic sleeves that glare |
| Spacing | No two booth QRs within ~1 m of each other |

**Test before bulk printing**
- [ ] Print **one** card.
- [ ] Scan on iPhone (Safari) and Android (Chrome).
- [ ] Confirm it opens the correct `/checkpoint/<token>` page.
- [ ] Submit a test rating; confirm the stamp appears in Passport.
- [ ] Test at 30 cm and at 1.5 m under venue lighting.
- [ ] Only then print the full run.

---

## 3. Copy templates

### 3.1 Booth QR card (A5)

```
┌──────────────────────────────┐
│  BOOTH A-01                  │
│  Faculty of Engineering      │
│                              │
│        [ QR CODE ]           │
│                              │
│  Scan to collect your stamp  │
│                              │
│  No camera? Ask staff for    │
│  the override code.          │
└──────────────────────────────┘
```

### 3.2 Entrance poster (A2)

```
        MIND SWAP @ FESKUM 2026
           DIGITAL PASSPORT

  1  Scan a booth QR
  2  Rate the booth
  3  Collect 8 stamps
  4  Redeem your prize at Helpdesk

              [ QR CODE ]
        Scan to start your passport

        feskum-mindswap.vercel.app
        (replace with final domain)
```

### 3.3 “How it works” strip (A3)

```
SCAN  →  RATE  →  COLLECT  →  REDEEM
  ↑        ↑          ↑          ↑
Booth   1–5 stars   8 stamps   Helpdesk

No app to install. Works in your browser.
```

### 3.4 UM Talk stage poster (A2)

```
              UM TALK
          PEOPLE'S CHOICE

   Vote for your favourite speaker
        in the MindSwap app

            [ QR CODE ]

   One vote per device. Voting closes
        before the final session.
```

### 3.5 Helpdesk redemption sign (A3)

```
        PRIZE REDEMPTION
        8 stamps required

  1  Open Passport → Show badge
  2  Staff verifies your Visitor ID
  3  Collect your souvenir

     Please queue here
```

### 3.6 Manual override card (A5 — staff only)

```
        STAFF OVERRIDE
   Camera not working?

   1. Open the Scan page
   2. Enter the booth token
   3. Enter the override code
   4. Tap Go
```

### 3.7 Directional signs (A3)

```
→  BOOTHS A–D
→  UM TALK STAGE
→  HELPdesk / PRIZE REDEMPTION
←  ENTRANCE
```

### 3.8 Paper tally form (A5)

```
MIND SWAP 2026 — NETWORK FALLBACK
Date: ____  Time: ____
Name: ______________________
Matric: ____________________
Faculty: ___________________
Stamps shown: ___ / 8
Prize given: Y / N
Staff: _____________________
```

---

## 4. Where each item goes

| Location | Items |
| --- | --- |
| Main entrance | Entrance poster (#3), “How it works” (#4), directional (#6) |
| Aisles | Directional signs (#6) at each turn |
| Each booth | Booth QR card (#1) + tent card (#2) |
| Stage / seating | UM Talk poster (#5) |
| Helpdesk | Redemption sign (#7), override card (#8), runbook (#9), token list (#10), tally forms (#12) |
| Volunteer kit | Briefing (#13), staff badge (#14) |

**Placement rules**
- [ ] QR visible before an attendee reaches the table, not hidden behind a laptop.
- [ ] Nothing reflective or glossy between the phone and the QR.
- [ ] Keep the sign stable — tape/putty both edges so it does not curl.
- [ ] Put the booth number on both the QR card and the tent card so map/list match.
- [ ] Do not put two booths’ QRs on the same stand.

---

## 5. Physical (non-printed) prep

### Booth setup
- [ ] Table + cloth per booth.
- [ ] Booth number tent card facing the aisle.
- [ ] QR card mounted at ~1.4 m (stand, easel, or wall).
- [ ] Phone stand / tablet for the booth’s own demo (optional).
- [ ] Power strip if the booth needs power.
- [ ] Confirm photo + description are live in the app.

### Helpdesk
- [ ] Table, chairs, queue markers.
- [ ] 2 charged phones/tablets logged into admin.
- [ ] Power bank + cables.
- [ ] 4G/5G hotspot as backup.
- [ ] Paper tally forms + pens + clipboard.
- [ ] Prize inventory + checklist.
- [ ] Printed runbook + token list (not posted publicly).

### Venue
- [ ] Walk the full route with a phone: entrance → aisles → booths → stage → helpdesk.
- [ ] Test campus Wi-Fi and mobile data in each zone.
- [ ] Identify dead spots; note where the hotspot is needed.
- [ ] Confirm lighting does not create glare on QR signs.
- [ ] Confirm signage does not block fire exits or venue signage.

### People
- [ ] Brief volunteers on: scan → rate → stamp → redeem; manual override; who to escalate to.
- [ ] One helpdesk lead owns the admin device and passcode.
- [ ] One runner replaces damaged signs.
- [ ] One technical lead monitors Admin → Overview and People’s Choice.

---

## 6. Print budget (indicative)

| Item | Qty | Unit (RM) | Total (RM) |
| --- | --- | --- | --- |
| A5 booth cards, 300 gsm + matte laminate | 12 | 3–5 | 36–60 |
| A5 tent cards, 300 gsm | 9 | 1–2 | 9–18 |
| A2 entrance poster + foam board | 2 | 12–20 | 24–40 |
| A3 how-it-works + foam | 2 | 8–12 | 16–24 |
| A2 UM Talk poster + foam | 2 | 12–20 | 24–40 |
| A3 directional + foam | 4 | 8–12 | 32–48 |
| A3 helpdesk sign + foam | 1 | 8–12 | 8–12 |
| A5 override cards + matte laminate | 2 | 3–4 | 6–8 |
| A4 paper docs (runbook, tokens, test) | 8 | 0.5 | 4 |
| A5 tally forms | 100 | 0.1 | 10 |
| A4 volunteer briefings | 6 | 0.5 | 3 |
| **Total** | | | **≈ RM172–257** |

**Lean path (≈ RM90–130):** print A4 instead of A2, reuse existing stands/foam
boards, print in-house or at a student print shop, and laminate only the booth
cards.

---

## 7. Day-of kit

- [ ] All printed signs + 2 spare booth cards
- [ ] Matte laminate pouches / pre-laminated spares
- [ ] Double-sided tape, mounting putty, zip ties
- [ ] Scissors, marker, cleaning cloth
- [ ] Power bank(s), charging cables, extension cord
- [ ] Hotspot + SIM with data
- [ ] 2 admin devices (phone + backup)
- [ ] Printed runbook, token list, tally forms, pens, clipboard
- [ ] Prize inventory checklist
- [ ] Staff badges
- [ ] A test phone (iPhone) and an Android phone

---

## 8. Final pre-print checklist

- [ ] Final domain is live and HTTPS works.
- [ ] QR sheet generated **from that domain** (Admin → Booths → QR sheet).
- [ ] All booths active, with correct `qr_token`, name, faculty, location, image.
- [ ] One test card scanned successfully on iPhone + Android.
- [ ] QR contrast, quiet zone, and size verified.
- [ ] Matte laminate chosen.
- [ ] Quantities counted against the final booth list.
- [ ] Staff-only sheets kept out of public print runs.
- [ ] Spares printed.
- [ ] Printed copy of `EVENT-OPS.md` §8–9 for the helpdesk.

---

## 9. If something is missing on the day

| Missing | Quick fix |
| --- | --- |
| A booth QR sign | Reprint from Admin → Booths, or use the manual token |
| QR won’t scan | Clean the lens/sign; move out of glare; use manual override |
| A2 foam board | Tape the A3/A4 print to a table or wall at eye level |
| Lamination | Use a clear matte sleeve; avoid glossy tape over the QR |
| Sign stand | Lean the card on a stand, box, or taped to the table edge |
| Printer | Print at the venue’s business centre or a nearby shop; use the digital QR sheet on a tablet as a last resort |
