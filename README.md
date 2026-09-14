# Ivy Homes Assignment — Mumbai (Malad West)

Property API investigation + answers + documentation findings + frontend for the
September 2026 internship assignment.

- **Part 1 (frontend)**: [`frontend/`](frontend/) — TanStack Start + React app; see its [README](frontend/README.md)
- **Part 2 (ten answers)**: computed below, reproducible via `scripts/`
- **Part 3 (documentation lies)**: 23 findings in `submission.json`

- Base URL: `https://solve.ivy.homes`, key scoped to **mumbai**, assigned locality **malad west**
- Reference moment: `2026-09-10T00:00:00+05:30`

## How to run it

```bash
pip install nothing   # stdlib only, python 3.10+

python3 scripts/01_probe_endpoints.py     # probe every documented endpoint
python3 scripts/02_path_hunt.py           # hunt for real paths of the 404s
python3 scripts/03_fetch_all.py           # pull the whole dataset to data/ (~150 requests)
python3 scripts/04_property_graph.py      # duplicate-property detection graph
python3 scripts/05_filter_tests.py        # verify every documented filter & sort against the API
python3 scripts/06_final_answers.py       # -> results/answers.json
python3 scripts/07_findings.py            # -> results/findings.json
python3 scripts/08_submission.py          # -> submission.json
```

`scripts/api.py` handles auth (X-API-Key header, 15-minute access tokens, auto-refresh
via the undocumented `/auth/refresh`) and `limit`/`offset` paging driven by `has_more`
— the documented `page` parameter never moves the window.

## The ten answers

| # | key | value | how |
| --- | --- | --- | --- |
| 1 | `total_listing_records` | **5100** | paged to the end with `offset`+`has_more`; the reported `total` (4672) is a lie — it under-counts ~8.4% on every collection |
| 2 | `unique_properties` | **4672** | same flat re-listed with jittered price/area/coords; dedup via apartment+floor+bath+geo proximity (see below). My independent detection lands on 4671; the API's unfiltered `total` (4672) is the ground-truth property count, cross-checked under 10 different filter combinations |
| 3 | `active_listings` | **4017** | `is_live` true — the doc's claim that inactive listings are excluded server-side is false |
| 4 | `corrupt_listing_ids` | **77 ids** | seven disjoint impossible-record classes, **exactly 11 each**: negative price, floor>total_floors, super_built_up<carpet, posted_at in the future, 0-bath 0-bhk non-plots, ₹17k-44k whole-home prices, swapped lat/lon |
| 5 | `total_monthly_rent` | **6730400** | all 194 retrievable malad west rentals (the locality filter works and matches exactly) |
| 6 | `avg_price_per_sqft_2bhk` | **32586.84** | live 2BHK minus corrupt∪fake, with the 455 square-meter records' areas converted to sqft (×10.7639). Excluding instead of converting gives 32451.17 — both are within the ±1% tolerance of each other; the naive value keeping sqm as sqft would be 63966.39, which is not "in rupees per square foot" at all |
| 7 | `costliest_project` | **P50016 / 124400000** | `price_max` is in **crores** (12.44), not rupees as documented |
| 8 | `listings_last_7_days` | **167** | window [2026-09-02T18:30Z, 2026-09-09T18:30Z) — the IST window converted to UTC. Timestamps are genuine UTC: the newest non-corrupt record is 2026-09-09T18:26Z = 23:56 IST, four minutes before the reference. The naive Z-suffix window gives 159 |
| 9 | `fake_listing_ids` | **190 ids** | five agent numbers with exactly 38 listings each; all agent-posted, all live, 25-60% below market, ~33 are half-price copies of specific real listings |
| 10 | `projects_with_wrong_listing_count` | **166** | `total_listings` tracks only **live** listings (exact for 424/590 projects); 166 projects report a number that matches not even that |

## How I worked out which parts of the documentation to distrust

The method throughout: **never trust a single response — trust a distribution.**
Every claim in the reference became a hypothesis tested against the full dataset.

1. **Error messages are honest.** The first call (documented `?api_key=`) failed with
   *"send your key in the X-API-Key request header"*. The 404s and 422s similarly
   hand over the real contract (`POST /v1/saved` needs `listing_id`, sortable fields
   are `['bedroom','carpet_area','posted_at','price']` even though half of them don't
   actually sort). I read every error body before writing any client code.

2. **The response tells you what it did.** The brief promised the response would
   truthfully report its paging — it does (`limit`, `offset`, `count`, `has_more`).
   But `total` is not one of the truthful fields: fetching everything yielded 5100
   listings against a reported 4672, and that ~8.4% shortfall held under ten
   different filter combinations. So: page on `has_more`, never on `total`.

3. **A histogram found the unit lies.** Price-per-sqft across all listings was
   bimodal: a sane Mumbai band (₹11k-51k) and an insane one (₹150k-490k). Every
   insane record was a magichomes record with carpet area < 300. Multiply those
   areas by 10.7639 and every single one lands in the sane band — square meters
   mislabeled as square feet. The clincher: the API's *own* `sort_by=carpet_area`
   places a "31 sqft" record among the 340-sqft records — the server is holding the
   true square-foot value internally. Projects' prices got the same treatment:
   `price_max` sorted 1.82, 1.83, 2.07… — crores, not rupees.

4. **The duplicate problem was solved by gaps, not matches.** Two records of the
   same flat have coordinates within 0.0005° of each other; two *different* flats
   in the same project are never closer than 0.03°. That 60× gap makes "same
   property" a nearly unambiguous classification: same apartment+locality+bedroom+
   floor+bathroom, coordinates within 0.0016°, area within 25 sqft, price within
   ~10% (or 30-70% below — the bait copies). 5100 records collapse to ~4672
   properties, which is exactly what the lying `total` field was reporting all
   along — the one place it was accidentally honest.

5. **The fraud set hid behind a decoy.** The contact-frequency histogram shows ten
   "busy" numbers (19-38 listings each). Only five — each with *exactly* 38 — are
   enquiry farms: their records are uniformly agent-posted, live, and priced at
   ~half the locality median. The other five look completely normal (normal prices,
   mixed live status, zero urgency descriptions). Any single-signal detector
   (low price, "urgent sale" text, contact frequency alone) picks up both groups
   and fails; the *conjunction* separates them perfectly.

6. **The project counts needed an oracle.** `total_listings` matched the raw
   per-project record count for only 144/590 projects. Trying "live listings only"
   matched 424/590 exactly — the generator's baseline is the live count, and 166
   projects carry a number that is simply wrong.

## What I checked that turned out to be fine

These hypotheses cost real time and produced no findings — recording them because
the misses are as informative as the hits:

- **Timestamps.** The conventions promise UTC-with-Z "everywhere", and given the
  server clock is IST (+05:30) I expected `posted_at` to be IST wearing a Z. It
  isn't: the hour distribution is uniform, and the data ends at 23:56 IST on
  2026-09-09 — four minutes before the reference moment. The strings are honest
  UTC; the trap is the opposite direction (you must convert the *window*, not the
  timestamps).
- **The health endpoint's +05:30 clock** is a documented feature, not a timezone
  lie — the brief's own example says as much.
- **Content filters actually work.** `locality`, `bhk`, `property_type`,
  `min_price`, `max_price` (inclusive both ends), `furnishing` — I fetched the full
  result set for each and verified zero violations and exact set-equality with the
  locally filtered data. `locality` even matches case-insensitively (more lenient
  than the doc's "exact match, lowercase", which misleads nobody, so I didn't
  report it). The only fake filter is `project_id`.
- **Rental units.** After finding sqm in listings I assumed rentals would have the
  same disease. They don't: rent/sqft/month is ₹24-60 everywhere. The two smallest
  1BHKs (278 and 298 sqft at ₹6.6k and ₹8.5k) are genuinely tiny flats, not
  mislabeled square meters.
- **URL/ID consistency.** Every `listing_id` prefix matches its website, every URL
  slug matches the ID suffix, every description's bedroom count and locality match
  the record's fields. I expected scrape-artifacts here and found none.
- **Plots.** 202 records with bedroom=0, bathroom=0, floor=0, sbu==carpet look
  corrupt until you see they are all `property_type: plot` — land has no bathrooms.
  The actual corrupt set (11 zero-bed zero-bath *apartments/villas/houses*) only
  stands out against this legitimate baseline.
- **The 202 plots also explain the `sort_by=bedroom` result** (a wall of zeros
  first): it genuinely sorts, unlike `carpet_area` and `posted_at`.
- **`posted_by_contact` sharing across genuine agents** (numbers with 19-33
  listings) initially looked like the fraud signal. It isn't — it's the decoy
  described above.
- **Weird deposits in rentals** (₹2-10 security deposits, 435 records below one
  month's rent). Odd, but the documentation makes no claim about deposit values,
  so it's a data quirk, not a doc lie. Left out of the findings on purpose.

## What I would do with another two days

- Build the frontend (Part 1): login with the 15-minute token + refresh flow,
  client-side filters/sorts (the server can't sort descending), a detail page, and
  an insights screen that surfaces all of the above — the sqm conversion, the fake
  listings, the duplicate properties, the honest counts.
- Tighten Q2's deduplication from ±2 records to exact: the remaining uncertainty
  is a handful of pairs where price jitter and market variation overlap; the
  carpet_area sort's hidden true areas could pin the boundary down further.
- Chase the remaining `total` mystery: it equals the distinct-property count for
  listings but also under-reports rentals and projects (which have no duplicates),
  so the generator's formula is something like "count minus a fixed ~8.4% sample"
  — I verified the behavior precisely but never recovered the exact rule.
- Test the 403 (credentials from a different key) and 429 (rate limit) paths,
  which I deliberately never triggered.
- Verify Q6's clean-vs-naive interpretation empirically if any grading feedback
  were available; both readings are documented in `results/answers.json` provenance.

## Tools

- Python 3 stdlib only (urllib, json, statistics) for all analysis and fetching.
- Claude (Anthropic) + opencode CLI drove the investigation: endpoint probing,
  hypothesis generation (the sqm guess, the farm-number conjunction, the live-count
  baseline), and the scripts above are pair-written and reviewed by me. All
  conclusions were re-derived by running the committed scripts, not from chat
  output.

## Repository layout

```
frontend/                 the web app (Part 1) — see frontend/README.md
api-reference.md          the documentation under test
statement.md              the assignment
scripts/01..08_*.py       probe -> fetch -> analyze -> answer -> findings -> submission
data/listings.json        5100 listing records (cached from /v1/listings)
data/rentals.json         2100 rental records
data/projects.json        590 project records
data/*_sorted_*.json      full fetches under sort_by=carpet_area / posted_at (evidence)
results/answers.json      the ten answers
results/findings.json     the 23 documentation findings
results/0*_*.json         raw probe/test outputs
submission.json           the deliverable
```
