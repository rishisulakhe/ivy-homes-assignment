"""Fetch the full dataset: listings, rentals, projects. ~145 requests."""
import json
import sys
import time

sys.path.insert(0, "/home/rishisulakhe/ivy_homes/scripts")
import api

api.login()

summary = {}

for name, path in [("listings", "/v1/listings"), ("rentals", "/v1/rentals"), ("projects", "/v1/projects")]:
    t0 = time.time()
    records, meta = api.fetch_all(path, page_size=50)
    api.save(f"{name}.json", records)
    summary[name] = {**meta, "seconds": round(time.time() - t0, 1)}
    print(f"{name}: fetched={meta['fetched']} total_reported={meta['total_reported']} pages={meta['pages']} ({summary[name]['seconds']}s)")

# also grab analytics-adjacent endpoints if any exist later
api.save("fetch_summary.json", summary)
print(json.dumps(summary, indent=2))
