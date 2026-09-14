# Ivy Homes — Assignment 



**City: Mumbai · Assigned locality: Malad West · Reference: `2026-09-10T00:00:00+05:30`**

A property-search web application built on top of the Ivy Homes Property API, plus a full
audit of a documentation that lies, and ten answers computed from the complete dataset.

---

## Demo

<!-- DEMO VIDEO — replace the line below when the recording is ready -->

[_[Demo video placeholder — link/embed coming soon]_](https://github.com/user-attachments/assets/d4a02904-e0ce-4476-a977-99e61a6dd5a9)

**Live** : https://ivy-homes-assignment.rishisulakhe42.workers.dev/


**Demo logins** (same password `d376a9a8bb`): `demo1@ivy.homes` · `demo2@ivy.homes` · `demo3@ivy.homes`

---


## Repository layout

```
frontend/            the web app - React with Tailwind and ShadCN UI
scripts/01..08_*.py  probe → fetch → analyze → answers → findings → submission
data/                cached full dataset + sort-order evidence
results/             answers.json, findings.json, raw probe outputs
submission.json      the deliverable (answers + 23 findings + evidence)
```

## Part 1 — The application (`frontend/`)

TanStack Start + React + Tailwind . Features:

1. **Login** — real auth with 15-minute tokens and silent background refresh (the app stays
   logged in past 30 minutes); session survives page reloads.
2. **Browse listings** — infinite scroll, and locality / BHK / price / furnishing / type
   filters that genuinely filter — server-side where the API honours them, client-side
   everywhere else.
3. **Listing detail** — one URL per listing, with similar homes computed locally.
4. **Saved listings** — per-user, optimistic, persistent across reload and re-login.
5. **Rentals & projects** — rents, deposits and maintenance shown exactly; project prices
   converted from crores to rupees; project listing counts computed from the data.
6. **Insights** — a dashboard the API was supposed to provide but doesn't: market charts plus
   a **data-quality radar** that surfaces every discovery below inside the product itself.

The frontend encodes the *verified* API contract, not the documented one — see
`frontend/src/lib/` for the auth, pagination and quality rules it relies on.

```bash
cd frontend && bun install && bun run dev     # http://localhost:8080
```

## Part 2 — The ten answers

[submission.json](https://github.com/rishisulakhe/ivy-homes-assignment/blob/ac0b0e2deac4c164beacb0dae8499c4971298262/submission.json#L9)

Computed from the full retrievable dataset (5,100 listings, 2,100 rentals, 590 projects);
reproduce with `python3 scripts/06_final_answers.py`.

| # | Answer | Note |
| --- | --- | --- |
| 1 | **5100** records | the reported `total` (4672) under-counts ~8% everywhere |
| 2 | **4672** distinct properties | ~9% of records are the same flat re-listed |
| 3 | **4017** live | 1,083 offline records are returned despite the docs' claim |
| 4 | **77** corrupt IDs | 7 impossible-record classes × exactly 11 each |
| 5 | **₹67,30,400** monthly rent | all 194 Malad West rentals |
| 6 | **₹32,586.84** /sqft | live 2BHK, corrupt + fake excluded, sqm areas corrected |
| 7 | **P50016 · ₹12,44,00,000** | project prices are crores, not rupees |
| 8 | **167** in the last 7 days | IST window converted to UTC (naive reading: 159) |
| 9 | **190** fake IDs | five agent numbers, 38 listings each, bait-priced |
| 10 | **166** projects | advertised counts don't match the live listing counts |

## Part 3 — Documentation findings

**23 verified discrepancies** (in `submission.json`, full evidence attached). The headline ones:

- **Auth**: key belongs in the `X-API-Key` header, not the query string; tokens last 15
  minutes *with* a refresh flow the docs deny exists.
- **Pagination**: `page` is silently ignored (it's `limit`+`offset`), max limit is 50 not
  200, and `total` is never the true count.
- **Missing endpoints**: `/v1/favourites` (really `/v1/saved`), `/v1/analytics/summary`,
  `/v1/listings/{id}/similar`, `/v1/listing/{id}`. **Undocumented**: `/v1/localities`, `/v1/me`.
- **Broken controls**: `order=desc` never works; `carpet_area`/`posted_at` sorts don't sort by
  the returned values; `project_id` on listings is ignored; rent price bounds are ignored.
- **Unit lies**: 455 listings carry **square metres labelled as sqft** (proved by the API's
  own sort ordering them by their hidden sqft value); project prices are in crores.
- **Data**: 77 impossible records, 190 enquiry-bait listings, ~446 duplicate properties,
  1,083 offline records, 166 wrong project counts.

## How I separated truth from documentation

Every claim became a hypothesis tested against the *full* dataset, never a single response:

- **Distributions over samples** — a price-per-sqft histogram exposed the bimodal split that
  revealed the square-metre records; a contact-frequency histogram exposed the five 38-listing
  bait numbers hiding behind five genuine busy agents (the decoy).
- **Gaps, not matches** — duplicate flats sit within 0.0005° of each other while distinct
  flats in the same project are never closer than 0.03°, making deduplication unambiguous.
- **Oracles** — `total_listings` matched the *live* count for 424/590 projects, revealing the
  generator's baseline and isolating the 166 truly wrong counts; the `total` field's 8.4%
  shortfall held under ten different filter combinations.
- **Error messages are honest** — the 401s and 422s hand over the real contract; I read every
  one before writing client code.

**What I checked that turned out fine** (the dead ends): timestamps really are UTC (the trap
is converting the *window*, not the values); content filters on listings work exactly;
rental units are clean; ID/URL/description consistency is perfect; the 202 zero-bath
zero-bedroom records are legitimate *plots*; shared phone numbers among genuine agents are
real, not fraud.


