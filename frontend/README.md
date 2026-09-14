# Ivy Homes — Mumbai property search (frontend)

Premium property-search web app for the Ivy Homes assignment (Part 1), built on
TanStack Start + React 19 + Tailwind 4 with a verified-first API contract: the
official API documentation is wrong in a dozen places, so every integration
decision below comes from probing the live API, not the docs.

## Run it

```bash
bun install
bun run dev        # http://localhost:8080
bun run build      # SSR build (Cloudflare/nitro output)
bun run lint       # eslint + prettier
```

Demo accounts (same password): `demo1@ivy.homes`, `demo2@ivy.homes`,
`demo3@ivy.homes` — quick-pick buttons on the sign-in screen.

## The six graded features

1. **Login** — real credentials, `X-API-Key` header + Bearer token, 15-minute
   access tokens with silent background refresh (~3 min before expiry, plus one
   401 retry), session restored from localStorage across reloads.
2. **Browse listings** — infinite scroll (offset + `has_more`, 50/page), locality /
   BHK / price / furnishing / property-type filters that actually filter
   (server-side where the API honours them, client-side elsewhere), client-side
   sorting over loaded results.
3. **Listing detail** — one URL per listing (`/listings/:id`), similar homes
   computed client-side (no such endpoint exists).
4. **Saved listings** — `/v1/saved` (the documented `/v1/favourites` 404s),
   optimistic heart toggle, per-user, persisted across reload and re-login,
   header badge count.
5. **Rentals & projects** — rentals load the full set once so price bounds
   (silently ignored by the API) filter exactly; project prices convert crores →
   rupees; project pages count their listings from the data because the
   `project_id` filter is ignored server-side.
6. **Insights** — the documented `/v1/analytics/summary` doesn't exist, so the
   dashboard computes everything client-side from the cached full dataset:
   locality mix, bedroom mix, median prices, ₹/sqft distribution with
   square-metre records corrected, plus a data-quality radar exposing
   duplicates, offline records, bait listings, corrupt records and wrong
   project counts.

## Verified API contract encoded in `src/lib/`

- Key in `X-API-Key` header (query param is rejected).
- `POST /auth/login` → `access_token` + `refresh_token`, `expires_in: 900`.
  Refresh via `POST /auth/refresh`; `/auth/logout` is a client-side discard.
- Pagination is `limit` (max 50) + `offset`; `page` is silently ignored;
  `total` under-reports ~8% and is never used for paging or display.
- Working listing filters: locality (case-insensitive), bhk, property_type,
  min/max price, furnishing. `project_id` on listings is ignored. Rental price
  bounds are ignored. `order=desc` never works (sorts are always ascending), so
  descending / area / date sorts are computed client-side.
- Project `price_min`/`price_max` are crores; six projects have them reversed.
- `is_live` exists but is undocumented; 21% of records are offline and shown
  with a badge instead of hidden.
- Data-quality rules (`src/lib/quality.ts`): five bait phone numbers
  (38 listings each, half-price urgency bait), 455 square-metre records on one
  portal converted ×10.7639, corrupt-record detection (negative prices, floor
  above building, super built-up below carpet, future dates, zero-bath homes,
  swapped coordinates), duplicate-flat detection for honest supply counts.

## Repo layout

- `src/lib/` — API client (auth + refresh + paging), data fetchers with dataset
  cache, quality rules, insights statistics, formatting.
- `src/components/` — cards, filter panel, header, skeletons, chips.
- `src/routes/` — TanStack Router file routes: login, listings (+detail),
  rentals (+detail), projects (+detail), saved, insights.

Built with Lovable for the initial scaffold and completed by hand; see the
parent repository's README for the full investigation write-up.
