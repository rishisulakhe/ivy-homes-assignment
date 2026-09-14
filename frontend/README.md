# Mumbai Property Pulse

# Build "Ivy Homes Mumbai" — a premium property-search web app

Build a production-quality React + Vite + Tailwind web app for browsing property listings in Mumbai, on top of a REST API I provide. The API's official documentation is UNRELIABLE — below is the VERIFIED truth from my own testing. Follow this spec exactly; do not "fix" it to match any doc you assume.

## Style & design goal
Premium real-estate marketplace feel — think Housing.com / Sotheby's Realty, not a bootstrap admin panel. Light theme, generous whitespace, large property imagery placeholders (gradient/pattern-based, no external images), crisp typography (Inter or similar), smooth micro-interactions and page transitions, sticky glassy header, responsive (mobile-first). Rupee formatting with Indian digit grouping (₹1.25 Cr, ₹45,00,000). Use lucide-react icons. Aim for "best design you can do" — this is being judged.

## API — verified contract (NOT what the docs say)

Base URL: `https://solve.ivy.homes`
API key: `IVY26-D4BC016512F7` — send as header `X-API-Key: IVY26-D4BC016512F7` on EVERY request (query param does NOT work).
Auth: Bearer token in `Authorization` header.

### Auth flow (critical — tokens expire in 15 minutes)
- `POST /auth/login` body `{"email": "...", "password": "..."}` → `{access_token, refresh_token, expires_in: 900, refresh_url: "/auth/refresh", user: {email}}`
- Auto-refresh BEFORE expiry: `POST /auth/refresh` body `{"refresh_token": "..."}` → new tokens. A silent background refresh timer (e.g. at 12 min, and on any 401 with one retry) is REQUIRED — the app must still work 30+ minutes after login.
- Persist tokens in localStorage; restore session on page load; "Logout" clears them (server-side logout is a no-op).
- Demo accounts (all same password `d376a9a8bb`): `demo1@ivy.homes`, `demo2@ivy.homes`, `demo3@ivy.homes`. Prefill demo1 on the login screen with a "use demo account" quick-pick for all three.

### Collections — pagination truth
`GET /v1/listings`, `GET /v1/rentals`, `GET /v1/projects` all accept:
- `limit` (max 50, silently clamped) and `offset`. The `page` parameter is SILENTLY IGNORED — never use it.
- Response: `{limit, offset, count, total, has_more, results}` — `total` LIES (under-counts ~8%). NEVER display total as the result count and never use it for paging. Page until `has_more === false`. For display, show "Showing X–Y" or "Loaded N properties" instead of a total.

### Endpoints that exist
- `GET /v1/listings?limit=&offset=&locality=&bhk=&property_type=&min_price=&max_price=&furnishing=&sort_by=` — filters that WORK: locality (case-insensitive), bhk, property_type, min_price, max_price (inclusive, rupees), furnishing. `sort_by` only truly sorts by `price` and `bedroom`, ALWAYS ascending — the `order` param is validated but IGNORED. So: fetch pages and sort/filter client-side for anything fancy (descending, area, date).
- `GET /v1/listings/{listing_id}` — single listing (plural path).
- `GET /v1/rentals`, `GET /v1/rentals/{id}` — same pagination; fields: price = monthly rent, deposit, maintenance, carpet_area, super_builtup_area, title, locality, bedroom, furnishing, is_live, posted_at.
- `GET /v1/projects`, `GET /v1/projects/{id}` — fields include total_listings (UNRELIABLE), price_min/price_max (IN CRORES — multiply by 1e7 for rupees), min/max_area_sqft, developer_name, project_status, amenities, rera_number, launch_date, possession_date.
- Saved listings (the documented /v1/favourites DOES NOT EXIST): `GET /v1/saved` → `{count, results}`; `POST /v1/saved` body `{"listing_id": "..."}`; `DELETE /v1/saved/{listing_id}`. Per-user, persists across sessions. Unauthorized (no/invalid token) → 401.
- `GET /v1/localities` → `{city, count, results: [{locality, listing_count}]}` — use for filter dropdown.
- `GET /v1/me` → `{user: {email}, city, city_id, assigned_locality, reference_date}` — call after login; show "Mumbai" context.
- `GET /health` (unauthenticated) — status check.

### Endpoints that DO NOT exist (do not call): `/v1/favourites`, `/v1/analytics/summary`, `/v1/listings/{id}/similar`, `/v1/listing/{id}` (singular). Compute "similar listings" client-side (same locality + same bedroom, price within ±15%).

## Screens & features (all six are graded — correctness over quantity)

### 1. Login
Centered card, brand mark "Ivy Homes", email+password, error display, demo-account quick buttons. Redirect to /listings. Protected routes redirect to /login.

### 2. Browse listings (home, `/listings`)
- Hero section with search: locality dropdown (from /v1/localities), BHK pills (1/2/3/4/5), price range (min/max inputs with ₹ Cr quick options), furnishing select, property type select. Filters must ACTUALLY filter (server-side via query params where they work, client-side on loaded data otherwise).
- Infinite scroll (IntersectionObserver) OR "Load more" button paging 50 at a time via offset/has_more. Show a skeleton-card grid while loading.
- Property cards: apartment name, locality, ₹ price (formatted Cr/L), bedroom/bathroom, carpet area sqft, furnishing chip, "Live" / "Offline" badge from `is_live`, heart icon to save (optimistic, synced to /v1/saved), project tag if project_id present.
- Client-side sort dropdown: price ↑/↓, area, newest (posted_at), bedrooms — computed client-side.
- Tabs or routes for Buy (listings) / Rent (rentals) / Projects.

### 3. Listing detail (`/listings/:id`)
Full field display, price in ₹ Cr, area, floor "7 of 18", facing, parking, verified badge, seller card (posted_by_name, posted_by type, posted_by_contact — formatted phone), full description, map placeholder using lat/lng, and a "Similar homes" strip computed client-side. Heart/save button. Deep-linkable by URL (fetch by id on mount). Same pattern for /rentals/:id and /projects/:id (project page: developer, status, RERA, amenities chips, unit count, price range from crores, possession date; show its listings by filtering the loaded listings collection client-side on project_id — the server ignores a project_id query param).

### 4. Saved listings (`/saved`)
Grid of saved properties per logged-in user, remove button, empty state, persists across reload and re-login. Badge count in the header.

### 5. Rentals (`/rentals`) and Projects (`/projects`)
Rentals: monthly rent prominent, deposit + maintenance secondary, same filter/sort treatment. Projects: card grid with developer, status chip, price range (convert crores → ₹), total units, area range; detail page per project.

### 6. Insights screen (`/insights`) — the showpiece
There is NO analytics endpoint — compute everything client-side from the listings you load (fetch all pages in the background, cache in memory/localStorage). Build a beautiful dashboard with charts (recharts): listings by locality (bar), by bedroom (pie/donut), median price by locality, price-per-sqft distribution histogram. Then a "Data quality radar" section that surfaces what I discovered about this dataset — this is the differentiator:
- 455 listings (all website "magichomes", carpet_area < 300) have areas in SQUARE METERS mislabeled as sqft — display both raw and converted (×10.7639) area on their detail pages; in insights show the bimodal ₹/sqft distribution.
- 77 corrupt listings (impossible data: negative prices, floor > total floors, super built-up < carpet, future posted dates, 0-bath apartments, ₹17k–44k "whole-home" prices, swapped lat/lng) — a "flagged" section listing them with the reason.
- 190 fake/enquiry-bait listings from 5 agent phone numbers (each number has exactly 38 listings, all priced 25–60% below market, "urgent sale" descriptions) — mark them with a subtle "price looks too good — possibly bait" warning chip on cards and detail pages (detect client-side: contact number in the set {+912007133812, +912007145137, +912000039837, +912007219058, +912003561453}).
- Duplicate properties: ~9% of records are the same flat re-listed (same apartment+locality+bedroom+floor+bathroom, coordinates within ~0.0005°) — show "5,100 records / ~4,672 unique homes".
- 166 of 590 projects report an incorrect listing count; 6 projects have price_min > price_max.
- 1,083 of 5,100 listings are not live.

## Engineering notes
- Central API client module: attaches X-API-Key + Bearer headers, single refresh-and-retry on 401, typed-ish helpers per endpoint, graceful error toasts.
- IMPORTANT: the API may not send CORS headers. If browser requests fail with CORS errors, add a thin serverless proxy route (Lovable edge function) that forwards to https://solve.ivy.homes and injects the X-API-Key header server-side; keep the rest of the app unchanged.
- Cache the full listings dataset (localStorage with timestamp) to make insights instant on revisit.
- React Router for all routes, every listing/project/rental reachable by URL.
- Empty/loading/error states everywhere. Handle 404 on bad ids.

When done, the acceptance test is: log in as demo1 → browse with filters → open a listing by URL → save it → reload page still logged in → wait 15+ minutes and still browse (token refresh works) → insights screen renders all charts and data-quality panels.

react with shadcn tailwind

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4499e25e-6cc6-4b90-9eb5-ff16c45d6775).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
